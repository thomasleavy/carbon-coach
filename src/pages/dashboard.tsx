// src/pages/dashboard.tsx

import { useState, useMemo } from 'react';
import { getServerSession } from 'next-auth/next';
import { authOptions } from './api/auth/[...nextauth]';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { useSession, signOut } from 'next-auth/react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import Link from 'next/link';
import styles from '../styles/Dashboard.module.css';

// Utility to format a Date object to "YYYY-MM-DD"
function formatDate(date: Date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export async function getServerSideProps(ctx: any) {
  const session = await getServerSession(ctx.req, ctx.res, authOptions);
  if (!session) {
    return { redirect: { destination: '/auth/login', permanent: false } };
  }
  return { props: {} };
}

export default function Dashboard() {
  const { data: session } = useSession();

  // 1️⃣ State: which date is “selected” (defaults to today)
  const today = new Date();
  const [selectedDate, setSelectedDate] = useState<string>(formatDate(today));

  // 1a️⃣ Temporary input state—so onBlur commits rather than on each keystroke
  const [tempDate, setTempDate] = useState<string>(formatDate(today));

  // 2️⃣ Build a 7-day window (array of date strings "YYYY-MM-DD") ending on selectedDate
  const weekDates: string[] = useMemo(() => {
    const end = new Date(selectedDate);
    const arr: string[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(end);
      d.setDate(end.getDate() - i);
      arr.push(formatDate(d));
    }
    return arr;
  }, [selectedDate]);

  // 3️⃣ Fetch activities once; we’ll filter locally
  const {
    data: activities = [],
    isLoading: loadingAct,
    error: errorAct,
  } = useQuery({
    queryKey: ['activities'],
    queryFn: () => axios.get('/api/activities').then((r) => r.data),
  });

  // 4️⃣ Fetch grid intensity for exactly that 7-day window
  const {
    data: grid = [],
    isLoading: loadingGrid,
    error: errorGrid,
  } = useQuery({
    queryKey: ['grid_intensity', selectedDate],
    queryFn: () =>
      axios
        .get(`/api/grid-intensity?range=7&end=${selectedDate}`)
        .then((r) => r.data),
  });

  if (loadingAct || loadingGrid) {
    return <p>Loading dashboard…</p>;
  }
  if (errorAct || errorGrid) {
    return <p>Error loading data: {(errorAct || errorGrid).message}</p>;
  }

  // 5️⃣ Build a map of user CO₂ by date (only within our 7-day window)
  const actByDate: Record<string, number> = {};
  activities.forEach((a: any) => {
    // a.recorded_at is e.g. "2025-05-23T14:52:00.000Z", slice to YYYY-MM-DD
    const d = a.recorded_at.slice(0, 10);
    if (weekDates.includes(d)) {
      actByDate[d] = (actByDate[d] || 0) + parseFloat(a.co2_kg);
    }
  });

  // 6️⃣ Build lineData = one object per day in weekDates:
  //    { date, intensity, userCo2 }
  const lineData = weekDates.map((dateStr) => {
    // find grid entry for this date
    const matchingGrid = grid.find((g: any) => g.date === dateStr);
    const intensityRaw = matchingGrid
      ? parseFloat(matchingGrid.kg_co2_per_kwh)
      : 0;
    const userRaw = actByDate[dateStr] || 0;

    return {
      date: dateStr,
      intensity: parseFloat(intensityRaw.toFixed(2)),
      userCo2: parseFloat(userRaw.toFixed(2)),
    };
  });

  // 7️⃣ Compute “selected day’s CO₂” and “weekly average”
  const selectedDayCo2 = parseFloat(((actByDate[selectedDate] || 0).toFixed(2)));
  const sumThisWeek = lineData.reduce((acc, d) => acc + d.userCo2, 0);
  const weeklyAvg = parseFloat((sumThisWeek / 7).toFixed(2));

  // 8️⃣ Build pieData for this 7-day window (breakdown by activity type)
  const byType: Record<string, number> = {};
  activities.forEach((a: any) => {
    const d = a.recorded_at.slice(0, 10);
    if (weekDates.includes(d)) {
      byType[a.type] = (byType[a.type] || 0) + parseFloat(a.co2_kg);
    }
  });
  const pieData = Object.entries(byType).map(([type, co2]) => ({
    name: type,
    value: parseFloat(co2.toFixed(2)),
  }));
  const PIE_COLORS = ['#0070f3', '#ff7f0e'];

  return (
    <main className={styles.pageContainer}>
      {/* Global header */}
      <header className={styles.header}>
        <h1>Carbon Coach</h1>
      </header>

      {/* Signed-in nav */}
      {session && (
        <nav className={styles.navSignedIn}>
          <Link href="/profile" className={styles.navLink}>
            Profile
          </Link>
          <Link href="/log" className={styles.navLink}>
            Log Activity
          </Link>
          <Link href="/" className={styles.navLink}>
            Home
          </Link>
          <a
            href="#"
            className={styles.navLink}
            onClick={(e) => {
              e.preventDefault();
              signOut({ redirect: false }).then(() => (window.location.href = '/'));
            }}
          >
            Log Out
          </a>
        </nav>
      )}

      {/* Back to Profile */}
      <div>
        <Link href="/profile">
          <button className={styles.backButton}>← Back to Profile</button>
        </Link>
      </div>

      {/* Date Picker */}
      <section className={styles.datePickerSection}>
        <label htmlFor="date-picker" className={styles.datePickerLabel}>
          Select Date (to view that week):
        </label>
        <input
          type="date"
          id="date-picker"
          value={tempDate}
          onChange={(e) => setTempDate(e.target.value)}
          onBlur={() => {
            // Commit only on blur (i.e. when user finishes typing and clicks/tabs away)
            if (tempDate) {
              setSelectedDate(tempDate);
            }
          }}
          className={styles.datePickerInput}
          max={formatDate(new Date())}
        />
      </section>

      {/* Metrics for the selected date/week */}
      <section className={styles.metrics}>
        <div className={styles.metricCard}>
          <h2>{`CO₂ on ${selectedDate}`}</h2>
          <p>{selectedDayCo2.toFixed(2)} kg</p>
        </div>
        <div className={styles.metricCard}>
          <h2>Weekly Average</h2>
          <p>{weeklyAvg.toFixed(2)} kg/day</p>
        </div>
      </section>

      {/* Charts for the selected week */}
      <section className={styles.charts}>
        <div className={styles.chartContainer}>
          <h3>CO₂ (kg) vs Grid (kg/kWh)</h3>
          <BarChart width={600} height={300} data={lineData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip formatter={(val: number) => val.toFixed(2)} />
            <Legend />
            <Bar dataKey="intensity" name="Grid (kg/kWh)" fill="#0070f3" />
            <Bar dataKey="userCo2" name="Your CO₂ (kg)" fill="#ff7f0e" />
          </BarChart>
        </div>

        <div className={styles.chartContainer}>
          <h3>Activity Breakdown (this week)</h3>
          <PieChart width={400} height={300}>
            <Pie
              data={pieData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={100}
              label
            >
              {pieData.map((_, idx) => (
                <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
              ))}
            </Pie>
            <Legend />
            <Tooltip formatter={(val: number) => val.toFixed(2)} />
          </PieChart>
        </div>
      </section>

      {/* Past 7 Days Table (for reference) */}
      <section className={styles.pastTableSection}>
        <h3 className={styles.sectionHeader}>That Week’s Daily Numbers</h3>
        <div className={styles.tableContainer}>
          <table className={styles.pastTable}>
            <thead>
              <tr>
                <th>Date</th>
                <th>Your CO₂ (kg)</th>
                <th>Grid Intensity (kg/kWh)</th>
              </tr>
            </thead>
            <tbody>
              {lineData.map((d) => (
                <tr key={d.date}>
                  <td>{d.date}</td>
                  <td>{d.userCo2.toFixed(2)}</td>
                  <td>{d.intensity.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Info Sections (always visible) */}
      <section className={styles.infoSection}>
        <h2 className={styles.sectionHeader}>What is a Kilowatt-hour (kWh)?</h2>
        <p className={styles.paragraph}>
          A <strong>kilowatt-hour</strong> (kWh) is just a way to measure how much electricity you use. 
          Imagine your phone charger draws about 0.1 kW (100 watts). If you leave it plugged in for 10 hours, 
          that’s 1 kWh of electricity. 💡 
          <br />
          <strong>Example:</strong> Let’s say you run a 100 W lamp for 10 hours—that’s 1 kWh. If the grid released 
          0.3 kg CO₂ to make each kWh, that lamp caused 0.3 kg CO₂—roughly the weight of three apples.
        </p>
      </section>

      <section className={styles.infoSection}>
        <h2 className={styles.sectionHeader}>Grid Carbon Intensity</h2>
        <p className={styles.paragraph}>
          “Grid intensity” tells you how much CO₂ (in kg) was emitted to produce 1 kWh of electricity on the 
          Irish grid on a given day. When you combine your kWh usage with that number, you see exactly how much CO₂ you helped create.
          <br />
          <strong>Example:</strong> Yesterday’s grid intensity was 0.25 kg CO₂/kWh. If you used 4 kWh that day (e.g. 
          charging devices, running lights, etc.), you produced 4 × 0.25 = 1 kg CO₂—about the weight of a small book.
        </p>
        <pre className={styles.codeBlock}>
your kWh × grid kg CO₂/kWh = your kg CO₂
        </pre>
      </section>

      <section className={styles.infoSection}>
        <h2 className={styles.sectionHeader}>Driving & CO₂</h2>
        <p className={styles.paragraph}>
          Driving a car emits CO₂, too. On average, a petrol car releases about <strong>0.18 kg CO₂ per kilometer</strong>.
          <br />
          <strong>Example:</strong> If you drive 5 km to meet a friend, that’s 5 × 0.18 = 0.9 kg CO₂—almost the weight 
          of a 1 L water bottle.
        </p>
        <pre className={styles.codeBlock}>
kilometers driven × 0.18 kg CO₂/km = your kg CO₂ from driving
        </pre>
      </section>

      <section className={styles.infoSection}>
        <h2 className={styles.sectionHeader}>Why Track?</h2>
        <ul className={styles.list}>
          <li>
            <strong>Awareness:</strong> See how small things—like charging your phone or driving to school—add up over a week.
          </li>
          <li>
            <strong>Improvement:</strong> When the grid gets cleaner (e.g. more wind or solar power), running your washing 
            machine then creates less CO₂. You can plan chores for those days.
          </li>
          <li>
            <strong>Goals:</strong> Set targets like “only drive 10 km per day” or “use no more than 5 kWh of electricity 
            daily” and watch your CO₂ drop.
          </li>
        </ul>
      </section>
    </main>
  );
}


