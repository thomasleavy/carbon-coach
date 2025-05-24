// src/pages/profile.tsx
import { getServerSession } from 'next-auth/next';
import { authOptions } from './api/auth/[...nextauth]';

export async function getServerSideProps(ctx) {
  const session = await getServerSession(ctx.req, ctx.res, authOptions);
  if (!session) {
    return { redirect: { destination: '/auth/login', permanent: false } };
  }
  return { props: { user: session.user } };
}

export default function Profile({ user }) {
  return <div>Welcome, {user.email}!</div>;
}


