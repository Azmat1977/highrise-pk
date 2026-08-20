//C:\dev\highrise-pk\pages\api\cities.ts
import type { NextApiRequest, NextApiResponse } from "next";
import dbConnect from "@/lib/dbConnect";
import Property from "@/models/Property";
import City from "@/models/City";

const MAX_TIME_MS = 5000;

// Fallbacks only used if:
// 1) City exists but has no uploaded imageUrl, OR
// 2) There are 0 City docs in DB yet (fresh install)
const CITY_FALLBACKS: Array<{ name: string; defaultImageUrl: string }> = [
  {
    name: "Lahore",
    defaultImageUrl: "https://images.unsplash.com/photo-1567440838554-a07d6a87c06c?w=600&q=80",
  },
  {
    name: "Karachi",
    defaultImageUrl: "https://images.unsplash.com/photo-1570796786683-c9ea03a4c5c0?w=600&q=80",
  },
  {
    name: "Islamabad",
    defaultImageUrl: "https://images.unsplash.com/photo-1583327445824-c5c0a6f9f5e4?w=600&q=80",
  },
  {
    name: "Rawalpindi",
    defaultImageUrl: "https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=600&q=80",
  },
  {
    name: "Faisalabad",
    defaultImageUrl: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=600&q=80",
  },
  {
    name: "Multan",
    defaultImageUrl: "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=600&q=80",
  },
];

const GLOBAL_DEFAULT_IMAGE =
  "https://images.unsplash.com/photo-1484154218962-a197022b5858?w=1200&q=80";

function keyOf(name: any): string {
  return String(name || "").trim().toLowerCase();
}

function isBadString(v: any): boolean {
  if (typeof v !== "string") return true;
  const s = v.trim().toLowerCase();
  return !s || s === "undefined" || s === "null" || s === "n/a" || s === "na";
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ success: false, message: "Method not allowed" });
  }

  await dbConnect();

  try {
    // 1) Count active properties by city
    const result = await Property.aggregate([
      { $match: { status: "active" } },
      { $group: { _id: "$city", count: { $sum: 1 } } },
    ]).option({ maxTimeMS: MAX_TIME_MS });

    // Case-insensitive count map
    const countMap: Record<string, number> = {};
    for (const item of result as any[]) {
      const k = keyOf(item?._id);
      if (!k) continue;
      countMap[k] = (countMap[k] || 0) + Number(item?.count || 0);
    }

    // 2) Read dynamic cities from DB (admin-managed)
    const cityDocs = await City.find({ $or: [{ isActive: true }, { isActive: { $exists: false } }] })
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
      .maxTimeMS(MAX_TIME_MS);

    const fallbackByName = CITY_FALLBACKS.reduce<Record<string, string>>((acc, c) => {
      acc[keyOf(c.name)] = c.defaultImageUrl;
      return acc;
    }, {});

    // If DB has no cities yet, fall back to seed list (so UI isn’t empty)
    const baseCities =
      cityDocs.length > 0
        ? cityDocs.map((c: any) => ({
            name: c.name,
            imageUrl: c?.image?.url || "",
            publicId: c?.image?.publicId || "",
            displayOrder: typeof c?.displayOrder === "number" ? c.displayOrder : 0,
            isActive: typeof c?.isActive === "boolean" ? c.isActive : true,
            isFeaturedOnHomepage: Boolean(c?.isFeaturedOnHomepage),
            createdAt: c?.createdAt || null,
            updatedAt: c?.updatedAt || null,
          }))
        : CITY_FALLBACKS.map((c) => ({
            name: c.name,
            imageUrl: "",
            publicId: "",
            displayOrder: 0,
            isActive: true,
            isFeaturedOnHomepage: false,
            createdAt: null,
            updatedAt: null,
          }));

    const cities = baseCities
      .filter((c) => c.isActive !== false)
      .map((c) => {
        const k = keyOf(c.name);
        const resolvedImageUrl =
          !isBadString(c.imageUrl) ? c.imageUrl : fallbackByName[k] || GLOBAL_DEFAULT_IMAGE;

        return {
          name: c.name,
          // keep backward compatibility with older frontend code
          image: resolvedImageUrl,
          imageUrl: resolvedImageUrl,
          publicId: c.publicId || "",
          propertyCount: countMap[k] || 0,
          displayOrder: c.displayOrder ?? 0,
          isActive: c.isActive !== false,
          isFeaturedOnHomepage: Boolean(c.isFeaturedOnHomepage),
          createdAt: c.createdAt,
          updatedAt: c.updatedAt,
        };
      });

    return res.status(200).json({ success: true, cities });
  } catch {
    return res.status(500).json({
      success: false,
      message: "Error fetching cities",
    });
  }
}
