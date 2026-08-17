import type { NextApiRequest, NextApiResponse } from 'next';
import { handleUnitStatusMutation } from '@/lib/units/statusMutation';

export default async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  const projectIdOrSlug = Array.isArray(req.query.id) ? req.query.id[0] : req.query.id;
  const unitId = Array.isArray(req.query.unitId) ? req.query.unitId[0] : req.query.unitId;
  return handleUnitStatusMutation(req, res, String(unitId ?? ''), String(projectIdOrSlug ?? ''));
}
