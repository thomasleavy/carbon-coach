// src/pages/index.tsx

import Link from 'next/link';

export default function Home() {
  return (
    <main style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1>Welcome to Carbon Coach</h1>
      <p>Your personal climate-impact tracker.</p>
      <nav style={{ marginTop: '1rem' }}>
        <Link href="/auth/signup">Sign Up</Link> |{' '}
        <Link href="/auth/login">Log In</Link> |{' '}
        <Link href="/profile">Profile</Link>
      </nav>
    </main>
  );
}
