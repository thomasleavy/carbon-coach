// src/scripts/fetchGridIntensity.ts

import * as path from 'path';
import * as dotenv from 'dotenv';
import axios from 'axios';
import { createClient } from '@supabase/supabase-js';

// 1) Load your .env.local from project root
dotenv.config({ path: path.resolve(__dirname, '../../.env.local') });

// 2) Initialize Supabase with your service role key
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function fetchAndStore() {
  try {
    // 3) Compute yesterday’s date
    const y = new Date();
    y.setDate(y.getDate() - 1);
    const dateStr = y.toISOString().slice(0, 10);           // "2025-05-23"
    const [YYYY, MM, DD] = dateStr.split('-');
    const monthNames = [
      "Jan","Feb","Mar","Apr","May","Jun",
      "Jul","Aug","Sep","Oct","Nov","Dec"
    ];
    const formatted = `${DD}-${monthNames[+MM - 1]}-${YYYY}`; // "23-May-2025"

    // 4) Fetch the data
    const url =
      `https://www.smartgriddashboard.com/api/chart/` +
      `?region=ALL` +
      `&chartType=co2` +
      `&dateRange=day` +
      `&dateFrom=${formatted}` +
      `&dateTo=${formatted}` +
      `&areas=co2intensity%2Cco2intensityforecast`;

    console.log('🔍 Fetching grid intensity from:', url);
    const res = await axios.get(url);
    console.log('📥 Fetched Rows count:', Array.isArray(res.data.Rows) ? res.data.Rows.length : 'NO ROWS');
    
    // 5) Guard and compute average
    if (!res.data.Rows || !Array.isArray(res.data.Rows)) {
      throw new Error('Unexpected API response: no Rows array');
    }
    const rows: Array<{ Value: number }> = res.data.Rows;
    const sumG = rows.reduce((acc, r) => acc + r.Value, 0);
    const avgKg = sumG / rows.length / 1000;

    // 6) Upsert into Supabase, but capture data & error
    console.log('🔄 Upserting into Supabase grid_intensity:', { date: dateStr, kg_co2_per_kwh: avgKg });
    const { data, error, status, statusText } = await supabase
      .from('grid_intensity')
      .upsert({ date: dateStr, kg_co2_per_kwh: avgKg });

    console.log('🆗 Supabase response:', { status, statusText, data, error });

    if (error) {
      throw error;
    }

    console.log(`✅ Stored grid intensity for ${dateStr}: ${avgKg.toFixed(3)} kg/kWh`);

  } catch (err: any) {
    console.error('❌ Failed to fetch/store grid intensity:', err.message || err);
    process.exit(1);
  }
}

fetchAndStore();


