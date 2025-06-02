// src/pages/log.tsx

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useSession, signOut } from 'next-auth/react';
import { getServerSession } from 'next-auth/next';
import { authOptions } from './api/auth/[...nextauth]';
import styles from '../styles/Home.module.css';

export async function getServerSideProps(ctx: any) {
  const session = await getServerSession(ctx.req, ctx.res, authOptions);
  if (!session) {
    return { redirect: { destination: '/auth/login', permanent: false } };
  }
  return { props: {} };
}

export default function LogActivity() {
  const { data: session } = useSession();
  const router = useRouter();

  // Form state
  const [activityType, setActivityType] = useState<'driving' | 'electricity'>('driving');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFeedbackMsg(null);
    setErrorMsg(null);

    // Basic validation
    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      setErrorMsg('Please enter a valid positive number.');
      setIsSubmitting(false);
      return;
    }

    // Build payload
    const payload = {
      type: activityType,
      // For driving: kilometers; for electricity: kWh
      amount: numericAmount,
      date,
    };

    try {
      const res = await fetch('/api/activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to log activity.');
      }

      setFeedbackMsg('Activity logged successfully!');
      setAmount('');
      // Optionally redirect to dashboard or stay here
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className={styles.pageContainer}>
      {/* Header */}
      <header className={styles.header}>
        <h1 className={styles.title}>Carbon Coach</h1>
      </header>

      {/* Signed‐in nav */}
      {session && (
        <nav className={styles.navSignedIn}>
          <Link href="/profile" className={styles.navLink}>
            Profile
          </Link>
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

      {/* Log Activity Card */}
      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Log a New Activity</h2>
        <form onSubmit={handleSubmit} className={styles.authForm}>
          <label className={styles.formLabel}>
            Activity Type:
            <select
              value={activityType}
              onChange={(e) => setActivityType(e.target.value as 'driving' | 'electricity')}
              className={styles.formInput}
            >
              <option value="driving">Driving (km)</option>
              <option value="electricity">Electricity (kWh)</option>
            </select>
          </label>

          <label className={styles.formLabel}>
            {activityType === 'driving' ? 'Kilometers Driven:' : 'kWh Used:'}
            <input
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className={styles.formInput}
              min="0"
              required
            />
          </label>

          <label className={styles.formLabel}>
            Date:
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={styles.formInput}
              required
            />
          </label>

          {errorMsg && <p className={styles.errorText}>{errorMsg}</p>}
          {feedbackMsg && <p className={styles.successText}>{feedbackMsg}</p>}

          <button type="submit" className={styles.button} disabled={isSubmitting}>
            {isSubmitting ? 'Logging…' : 'Log Activity'}
          </button>
        </form>
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


