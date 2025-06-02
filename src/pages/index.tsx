// src/pages/index.tsx

import { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useSession, signOut, signIn } from 'next-auth/react';
import { createClient } from '@supabase/supabase-js';
import styles from '../styles/Home.module.css';

// Initialize Supabase (reuse your env vars from .env.local)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function Home() {
  const { data: session } = useSession();
  const router = useRouter();

  // Form state
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [username, setUsername] = useState('');   // ← NEW: username
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const toggleMode = () => {
    setErrorMsg(null);
    setUsername('');
    setEmail('');
    setPassword('');
    setIsLoginMode((prev) => !prev);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    const res = await signIn<'credentials'>('credentials', {
      redirect: false,
      email,
      password,
    });

    if (res?.error) {
      setErrorMsg(res.error);
      setLoading(false);
      return;
    }
    // No error → redirect to /profile
    router.push('/profile');
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    // 1) Sign up with Supabase Auth
    const { data, error } = await supabase.auth.signUp(
      { email, password },
      { data: {} }
    );

    if (error) {
      setErrorMsg(error.message);
      setLoading(false);
      return;
    }

    const newUserId = data.user?.id;
    if (!newUserId) {
      setErrorMsg('Unexpected error: no user ID returned.');
      setLoading(false);
      return;
    }

    // 2) Insert into 'profiles' table
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({ id: newUserId, username: username.trim() });

    if (profileError) {
      setErrorMsg(profileError.message);
      setLoading(false);
      return;
    }

    // 3) Automatically sign in
    const res = await signIn<'credentials'>('credentials', {
      redirect: false,
      email,
      password,
    });

    if (res?.error) {
      setErrorMsg(res.error);
      setLoading(false);
      return;
    }

    // 4) No error → redirect to /profile
    router.push('/profile');
  };

  return (
    <main className={styles.pageContainer}>
      {/* Header */}
      <header className={styles.header}>
        <h1 className={styles.title}>Carbon Coach</h1>
        <p className={styles.subtitle}>
          Track driving and electricity emissions, daily—reduce your carbon footprint.
        </p>
      </header>

      {/* If signed-in, show nav; otherwise show embedded auth forms */}
      {session ? (
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
      ) : (
        <section className={styles.authSection}>
          <div className={styles.authContainer}>
            <h2 className={styles.authHeader}>
              {isLoginMode ? 'Log In to Carbon Coach' : 'Sign Up for Carbon Coach'}
            </h2>
            <form
              onSubmit={isLoginMode ? handleLogin : handleSignUp}
              className={styles.authForm}
            >
              {/* Only show Username field in Sign-Up mode */}
              {!isLoginMode && (
                <label className={styles.formLabel}>
                  Username:
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className={styles.formInput}
                    required
                    minLength={3}
                    maxLength={20}
                  />
                </label>
              )}

              <label className={styles.formLabel}>
                Email:
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={styles.formInput}
                  required
                />
              </label>

              <label className={styles.formLabel}>
                Password:
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={styles.formInput}
                  required
                  minLength={6}
                />
              </label>

              {errorMsg && <p className={styles.errorText}>{errorMsg}</p>}

              <button type="submit" className={styles.button} disabled={loading}>
                {loading
                  ? isLoginMode
                    ? 'Logging In…'
                    : 'Signing Up…'
                  : isLoginMode
                  ? 'Log In'
                  : 'Sign Up'}
              </button>
            </form>

            <p className={styles.toggleText}>
              {isLoginMode ? "Don't have an account?" : 'Already have an account?'}{' '}
              <button onClick={toggleMode} className={styles.toggleButton}>
                {isLoginMode ? 'Sign Up' : 'Log In'}
              </button>
            </p>
          </div>
        </section>
      )}

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


