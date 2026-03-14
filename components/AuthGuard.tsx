'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

/**
 * Government-grade route protection.
 * - Unauthenticated users on protected routes → redirect to login
 * - Authenticated users on login page → redirect to dashboard
 * - No guest/anonymous access per SECURITY.md
 */
export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const token = sessionStorage.getItem('munin_token');

    // Login page: if already authenticated, redirect to dashboard
    if (pathname === '/') {
      if (token) {
        router.replace('/graph');
        return;
      }
      setReady(true);
      return;
    }

    // Protected route: require authentication
    if (!token) {
      router.replace('/');
      return;
    }
    setReady(true);
  }, [pathname, router]);

  // Show minimal loading state while verifying (avoids flash of protected content)
  if (!ready && pathname !== '/') {
    return (
      <div className="min-h-screen bg-base-950 flex flex-col items-center justify-center text-text-muted font-mono text-sm">
        <div className="animate-pulse">Verifying session...</div>
      </div>
    );
  }

  return <>{children}</>;
}
