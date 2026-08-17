import type { NextApiRequest, NextApiResponse } from "next";
import crypto from "crypto";
import dbConnect from "@/lib/dbConnect";
import { getOptionalAuth } from "@/lib/optionalAuth";
import { runPropertyCleanupWorker } from "@/lib/property/propertyCleanupWorker";

function safeEqual(a: string, b: string) {
  const aa = Buffer.from(a);
  const bb = Buffer.from(b);
  return aa.length === bb.length && crypto.timingSafeEqual(aa, bb);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader("Cache-Control", "private, no-store");
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  const configured = process.env.CRON_SECRET || "";
  const supplied = typeof req.headers.authorization === "string"
    ? req.headers.authorization.replace(/^Bearer\s+/i, "").trim()
    : "";
  const cronAuthorized = Boolean(configured && supplied && safeEqual(configured, supplied));
  const optionalAuth = cronAuthorized ? null : await getOptionalAuth(req);
  const adminAuthorized = optionalAuth?.authorityRole === "admin" || optionalAuth?.authorityRole === "superadmin";
  if (!cronAuthorized && !adminAuthorized) {
    return res.status(401).json({ success: false, error: "Unauthorized" });
  }

  await dbConnect();
  const result = await runPropertyCleanupWorker(20);
  return res.status(200).json({ success: true, ...result });
}
