// src/pages/api/activities.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from './auth/[...nextauth]';
import { supabase } from '../../utils/supabaseClient';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // 1) Ensure user is signed in
  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ error: 'Not authenticated' });
  const userId = session.user.id;

  if (req.method === 'POST') {
    const { type, amount } = req.body as { type: 'driving'|'electricity'; amount: number };
    // 2) Compute CO₂ (example factors: driving 0.180 kg/km, electricity use grid intensity?)
    const factor = type === 'driving' ? 0.180 : 0.300;  // replace with real lookup if you like
    const co2_kg = parseFloat((amount * factor).toFixed(3));

    const { data, error } = await supabase
      .from('activities')
      .insert([{ user_id: userId, type, amount, co2_kg }])
      .select();

    if (error) return res.status(500).json({ error: error.message });
    return res.status(201).json(data![0]);
  }

  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('activities')
      .select('*')
      .eq('user_id', userId)
      .order('recorded_at', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json(data);
  }

  res.setHeader('Allow', ['GET', 'POST']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}
