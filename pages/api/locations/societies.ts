// pages/api/locations/societies.ts
import type { NextApiRequest, NextApiResponse } from "next";
import dbConnect from "@/lib/db";
import Location from "@/models/Location";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ message: "Method not allowed" });

  const city = typeof req.query.city === "string" ? req.query.city : "";
  if (!city) return res.status(400).json({ message: "city is required" });

  await dbConnect();

  const list = await Location.find({ city, status: "ACTIVE" })
    .sort({ society: 1 })
    .select({ society: 1, _id: 0 })
    .lean();

  return res.status(200).json({ societies: list.map((x) => x.society) });
}
