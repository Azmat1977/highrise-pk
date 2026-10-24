//C:\dev\highrise-pk\pages\api\cities.ts
import type { NextApiRequest, NextApiResponse } from "next";
import dbConnect from "@/lib/dbConnect";
import Property from "@/models/Property";
import City from "@/models/City";
import { PUBLIC_PROPERTY_FILTER } from "@/lib/property/publicProperty";
import {
  PAKISTAN_CITIES_META,
  POPULAR_CITIES,
  normalizeCityName,
  type PakistaniCityMeta,
} from "@/lib/pakistanCities";

const MAX_TIME_MS = 5000;

const CURATED_ORDER = ["Islamabad", "Lahore", "Karachi", "Rawalpindi"];

interface CityApiResponse {
  name: string;
  province: string;
  image: string;
  imageUrl: string;
  publicId: string;
  propertyCount: number;
  displayOrder: number;
  isActive: boolean;
  isFeaturedOnHomepage: boolean;
  tagline: string | null;
  description: string | null;
  landmarkTitle: string | null;
  landmarkKicker: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

interface CityWithRank extends CityApiResponse {
  _tier: number;
  _tierOrder: number | string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ success: false, message: "Method not allowed" });
  }

  await dbConnect();

  try {
    const [aggregateResult, cityDocs] = await Promise.all([
      Property.aggregate([
        { $match: { ...(PUBLIC_PROPERTY_FILTER as Record<string, unknown>) } },
        { $group: { _id: "$city", count: { $sum: 1 } } },
      ]).option({ maxTimeMS: MAX_TIME_MS }),
      City.find({ $or: [{ isActive: true }, { isActive: { $exists: false } }] })
        .select({
          name: 1,
          image: 1,
          displayOrder: 1,
          isActive: 1,
          isFeaturedOnHomepage: 1,
          updatedAt: 1,
          createdAt: 1,
        })
        .sort({ displayOrder: 1, updatedAt: -1 })
        .lean()
        .maxTimeMS(MAX_TIME_MS),
    ]);

    const countMap: Record<string, number> = {};
    for (const item of aggregateResult as Array<{ _id?: unknown; count?: unknown }>) {
      const canonical = normalizeCityName(String(item?._id ?? ""));
      const count = Number(item?.count ?? 0);
      if (!canonical || !Number.isFinite(count) || count <= 0) continue;
      countMap[canonical] = (countMap[canonical] || 0) + count;
    }

    const docByName = new Map<string, any>();
    for (const doc of cityDocs as any[]) {
      const name = String(doc?.name ?? "").trim();
      if (!name) continue;
      docByName.set(name.toLowerCase(), doc);
    }

    const curatedIndex = new Map(CURATED_ORDER.map((n, i) => [n, i]));
    const popularIndex = new Map(POPULAR_CITIES.map((n, i) => [n, i]));

    const cities: CityWithRank[] = PAKISTAN_CITIES_META.flatMap((meta: PakistaniCityMeta) => {
      const doc = docByName.get(meta.name.toLowerCase());
      const propertyCount = countMap[meta.name] || 0;
      let dbOrder = typeof doc?.displayOrder === "number" ? doc.displayOrder : 0;
      if (!Number.isFinite(dbOrder) || dbOrder < 0 || !Number.isInteger(dbOrder)) dbOrder = 0;
      const dbFeatured = Boolean(doc?.isFeaturedOnHomepage);

      const tier = dbOrder > 0
        ? 0
        : dbFeatured
          ? 1
          : curatedIndex.has(meta.name)
            ? 2
            : popularIndex.has(meta.name)
              ? 3
              : 4;

      const tierOrder = tier === 0
        ? dbOrder
        : tier === 1
          ? dbOrder
          : tier === 2
            ? (curatedIndex.get(meta.name) ?? 99)
            : tier === 3
              ? (popularIndex.get(meta.name) ?? 999)
              : meta.name.toLowerCase();

      const cloudinaryUrl = typeof doc?.image?.url === "string" ? doc.image.url : "";
      const cloudinaryPublicId = typeof doc?.image?.publicId === "string" ? doc.image.publicId : "";

      const payload: CityWithRank = {
        name: meta.name,
        province: meta.province,
        image: cloudinaryUrl,
        imageUrl: cloudinaryUrl,
        publicId: cloudinaryPublicId,
        propertyCount,
        displayOrder: dbOrder,
        isActive: doc ? doc.isActive !== false : true,
        isFeaturedOnHomepage: dbFeatured,
        tagline: meta.tagline ?? null,
        description: meta.description ?? null,
        landmarkTitle: meta.landmark?.title ?? null,
        landmarkKicker: meta.landmark?.kicker ?? null,
        createdAt: doc?.createdAt ? new Date(doc.createdAt).toISOString() : null,
        updatedAt: doc?.updatedAt ? new Date(doc.updatedAt).toISOString() : null,
        _tier: tier,
        _tierOrder: tierOrder,
      };
      return [payload];
    });

    const sorted = [...cities].sort((a, b) => {
      if (a._tier !== b._tier) return a._tier - b._tier;
      if (typeof a._tierOrder === "number" && typeof b._tierOrder === "number") {
        if (a._tierOrder !== b._tierOrder) return a._tierOrder - b._tierOrder;
        return a.name.localeCompare(b.name);
      }
      return String(a._tierOrder).localeCompare(String(b._tierOrder));
    });

    const cleaned = sorted.map((c): CityApiResponse => ({
      name: c.name,
      province: c.province,
      image: c.image,
      imageUrl: c.imageUrl,
      publicId: c.publicId,
      propertyCount: c.propertyCount,
      displayOrder: c.displayOrder,
      isActive: c.isActive,
      isFeaturedOnHomepage: c.isFeaturedOnHomepage,
      tagline: c.tagline,
      description: c.description,
      landmarkTitle: c.landmarkTitle,
      landmarkKicker: c.landmarkKicker,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    }));

    return res.status(200).json({ success: true, cities: cleaned });
  } catch {
    return res.status(500).json({
      success: false,
      message: "Error fetching cities",
    });
  }
}
