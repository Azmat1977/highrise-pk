import type { NextApiRequest, NextApiResponse } from "next";
import { requireAdmin } from "@/lib/requireAdmin";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const admin = await requireAdmin(req, res);
  if (!admin) return;
  res.setHeader("Cache-Control", "private, no-store");
  res.status(410).json({
    ok: false,
    error: "This legacy restore route has been retired.",
    code: "ROUTE_RETIRED",
    replacement: "/api/admin/properties/[propertyId]/trash",
  });
}
