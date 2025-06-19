# Carbon Coach
 
A personal climate-impact tracker built with Next.js, Supabase & Recharts.
  
## Tech Stack  
- **Frontend:** Next.js (React + TypeScript), TanStack Query, CSS Modules
- **Backend:** Next.js API routes, Supabase Auth + Postgres
- **Charts:** Recharts
- **CI/CRON:** GitHub Actions or Supabase Edge Functions
- **Deploy:** Vercel (app), Supabase (database) 

## Demonstrated Features
- Sign-up & authentication via email/password and GitHub OAuth
- Daily “activities” log (driving k m, electricity kWh → CO₂)
- Nightly cron job that fetches grid carbon intensity (EirGrid API) and stores in Supabase
- Dashboard: bar charts for the selected week, pie chart breakdown, and a date-picker
- Export CSV summary for any month via `/api/export`
- Responsive UI with a consistent “Carbon Coach” header on every page
