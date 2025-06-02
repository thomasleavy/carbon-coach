// src/pages/api/grid-intensity.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../utils/supabaseClient';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).end('Method Not Allowed');
  }

  const range = parseInt((req.query.range as string) || '7', 10);
  // Compute date_from = today - (range - 1) days
  const today = new Date();
  const from = new Date();
  from.setDate(today.getDate() - (range - 1));

  const { data, error } = await supabase
    .from('grid_intensity')
    .select('date,kg_co2_per_kwh')
    .gte('date', from.toISOString().slice(0, 10))
    .lte('date', today.toISOString().slice(0, 10))
    .order('date', { ascending: true });

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.status(200).json(data);
}
