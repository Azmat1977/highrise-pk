// pages/api/locations/request.ts
import type { NextApiRequest, NextApiResponse } from "next";
import dbConnect from "@/lib/dbConnect";
import Location from "@/models/Location";
import { requireAuth } from "@/lib/requireAuth";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ message: "Method not allowed" });

  const auth = await requireAuth(req, res);
  if (!auth) return;

  const { city, society } = req.body || {};
  if (!city || !society) return res.status(400).json({ message: "city and society are required" });

  await dbConnect();

  // Create as PENDING (admin will approve later)
  try {
    await Location.create({
      city: String(city).trim(),
      society: String(society).trim(),
      status: "PENDING",
      createdBy: auth.id,
    });
  } catch (e: any) {
    // If duplicate exists, just return OK (no spam)
    return res.status(200).json({ success: true, message: "Request received (already exists)" });
  }

  return res.status(200).json({ success: true, message: "Request received" });
}
