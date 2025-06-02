// src/pages/api/export.ts

import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from './auth/[...nextauth]';
import { createClient } from '@supabase/supabase-js';
import { parse as json2csv } from 'json2csv';

// ——————————————————————————————————————————————————————————————————————————
// Initialize Supabase client (anon key is fine if row‐level security
// is set to only allow "SELECT" from activities for the current user).
// If you need elevated rights (e.g. to query profiles), you can switch
// to service role here—but for exporting user‐only rows, anon key + RLS is fine.
// ——————————————————————————————————————————————————————————————————————————
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // 1) Check authentication
  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // We assume `session.user.id` is the Supabase user ID
  const userId = session.user.id;

  // 2) Expect a `month` and `year` query‐param, e.g. `/api/export?month=5&year=2025`
  //    Alternatively, you could accept a single YYYY-MM string. Adjust as needed.
  const monthParam = Number(req.query.month); // 1-12
  const yearParam = Number(req.query.year);   // e.g. 2025

  if (
    !monthParam ||
    !yearParam ||
    monthParam < 1 ||
    monthParam > 12 ||
    yearParam < 1900
  ) {
    return res
      .status(400)
      .json({ error: 'Please provide valid month (1–12) and year (e.g. 2025).' });
  }

  // 3) Calculate `from` and `to` dates as full ISO strings for that month
  //    e.g. 2025-05-01 → 2025-05-31
  const fromDate = new Date(Date.UTC(yearParam, monthParam - 1, 1));
  // create a date at first of next month, then subtract 1 day
  const nextMonth = new Date(Date.UTC(yearParam, monthParam, 1));
  nextMonth.setUTCDate(nextMonth.getUTCDate() - 1);
  const toDate = nextMonth; // last day of requested month

  const fromISO = fromDate.toISOString().slice(0, 10); // "2025-05-01"
  const toISO = toDate.toISOString().slice(0, 10);     // e.g. "2025-05-31"

  try {
    // 4) Query Supabase for all activities in that date‐range for this user
    const { data: activities, error } = await supabase
      .from('activities')
      .select('recorded_at, type, value, co2_kg')
      .eq('user_id', userId)
      .gte('recorded_at', fromISO)
      .lte('recorded_at', toISO)
      .order('recorded_at', { ascending: true });

    if (error) {
      console.error('Supabase fetch error:', error);
      return res
        .status(500)
        .json({ error: 'Failed to fetch activities from database.' });
    }

    // 5) Map the raw rows into a flat JSON array for JSON2CSV.
    //    We will use fields: date, activity_type, value, co2_kg
    const rowsForCsv = activities!.map((a) => {
      // recorded_at might be "2025-05-23T14:52:00.000Z" → slice to YYYY-MM-DD
      const dateOnly = a.recorded_at.slice(0, 10);
      return {
        date: dateOnly,
        activity_type: a.type,
        value: a.value,
        co2_kg: a.co2_kg,
      };
    });

    // 6) Build the metadata header (two lines + blank line)
    //    Use session.user.name if you store a username; otherwise fallback to session.user.email
    const displayName = session.user.name || session.user.email;
    const metadataLines = [
      'Carbon Coach',               // line 1
      `User: ${displayName}`,       // line 2
      ''                            // blank line before real CSV header
    ].join('\n');

    // 7) Convert the JSON array to CSV (no BOM, default comma, header row included)
    //    Make sure the `fields` match exactly our mapped keys above:
    const csvBody = json2csv(rowsForCsv, {
      fields: ['date', 'activity_type', 'value', 'co2_kg'],
      header: true,
    });

    // 8) Concatenate metadata + csvBody
    const finalCsv = metadataLines + '\n' + csvBody;

    // 9) Set headers for file download
    const fileName = `carbon-coach-${yearParam}-${String(monthParam).padStart(2, '0')}.csv`;
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${fileName}"`
    );

    // 10) Return the CSV
    return res.status(200).send(finalCsv);
  } catch (err: any) {
    console.error('Export route error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
}
