import type { NextApiRequest, NextApiResponse } from 'next';
import { handleUnitStatusMutation } from '@/lib/units/statusMutation';

export default async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  const id = Array.isArray(req.query.id) ? req.query.id[0] : req.query.id;
  return handleUnitStatusMutation(req, res, String(id ?? ''));
}
