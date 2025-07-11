// src/pages/profile.tsx

import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { getServerSession } from 'next-auth/next';
import { authOptions } from './api/auth/[...nextauth]';
import { createClient } from '@supabase/supabase-js';
import styles from '../styles/Home.module.css';

// Initialize Supabase (use the anon key for selecting)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function getServerSideProps(ctx) {
  // 1) Ensure user is authenticated
  const session = await getServerSession(ctx.req, ctx.res, authOptions);
  if (!session) {
    return { redirect: { destination: '/auth/login', permanent: false } };
  }

  const userId = session.user.id;

  // 2) Query the 'profiles' table for this user's username
  const { data, error } = await supabase
    .from('profiles')
    .select('username')
    .eq('id', userId)
    .single();

  if (error || !data) {
    // If profile row is missing (shouldn't happen if signUp always inserted),
    // fallback to email or redirect to fix your profile
    return {
      props: { username: session.user.email || null },
    };
  }

  return {
    props: { username: data.username },
  };
}

export default function Profile({ username }: { username: string | null }) {
  const { data: session } = useSession();

  return (
    <main className={styles.pageContainer}>
      {/* Header */}
      <header className={styles.header}>
        <h1 className={styles.title}>Carbon Coach</h1>
      </header>

      {/* Signed‐in nav */}
      {session && (
        <nav className={styles.navSignedIn}>
          <Link href="/dashboard" className={styles.navLink}>
            Dashboard
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

      {/* Welcome card */}
      <section className={styles.card}>
        <h2 className={styles.cardTitle}>
          Welcome, {username ? username : 'User'}!
        </h2>
        <p className={styles.cardText}>
          Use the buttons above to view your dashboard or log a new activity.
        </p>
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
    Irish grid on a given day. When you combine your kWh usage with that number, you see exactly how much 
    CO₂ you helped create.
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




