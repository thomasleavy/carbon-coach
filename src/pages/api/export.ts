// src/pages/api/export.ts

import type { NextApiRequest, NextApiResponse } from 'next';
import { parse } from 'json2csv';
import { getServerSession } from 'next-auth/next';
import { authOptions } from './auth/[...nextauth]';
import { supabase } from '../../utils/supabaseClient';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // 1) Auth check
  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).end('Not authenticated');

  // 2) Read the month query (YYYY-MM)
  const month = req.query.month as string;
  if (!/^\d{4}-\d{2}$/.test(month)) {
    return res.status(400).end('Invalid month format');
  }

  // 3) Compute start/end
  const [year, mon] = month.split('-').map(Number);
  const start = new Date(year, mon - 1, 1);
  const end   = new Date(year, mon, 0, 23, 59, 59);

  // 4) Fetch activities in that month
  const { data: activities, error: actErr } = await supabase
    .from('activities')
    .select('recorded_at,type,amount,co2_kg')
    .gte('recorded_at', start.toISOString())
    .lte('recorded_at', end.toISOString())
    .order('recorded_at', { ascending: true });
  if (actErr) return res.status(500).json({ error: actErr.message });

  // 5) Fetch grid intensity in that month
  const { data: grid, error: gridErr } = await supabase
    .from('grid_intensity')
    .select('date,kg_co2_per_kwh')
    .gte('date', start.toISOString().slice(0,10))
    .lte('date', end.toISOString().slice(0,10))
    .order('date', { ascending: true });
  if (gridErr) return res.status(500).json({ error: gridErr.message });

  // 6) Combine into rows
  const rows = activities.map(a => ({
    date: a.recorded_at,
    activity: a.type,
    amount: a.amount,
    co2_kg: a.co2_kg,
    grid_kg_per_kwh: grid.find(g => g.date === a.recorded_at.slice(0,10))?.kg_co2_per_kwh ?? ''
  }));

  // 7) Convert to CSV
  const csv = parse(rows, {
    fields: ['date','activity','amount','co2_kg','grid_kg_per_kwh']
  });

  // 8) Send as attachment
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="carbon-coach-${month}.csv"`
  );
  res.status(200).send(csv);
}
