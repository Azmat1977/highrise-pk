import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '@/lib/dbConnect';
import User from '@/models/User';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  await dbConnect();

  if (req.method === 'GET') {
    try {
      const users = await User.find({}).select('-password');
      res.status(200).json(users);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch users' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
