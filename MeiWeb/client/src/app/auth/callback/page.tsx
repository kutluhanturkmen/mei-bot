'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/lib/auth';

/**
 * After Discord OAuth2 redirect, the API sets a JWT httpOnly cookie and
 * redirects the browser here. We simply re-fetch the session and send
 * the user to /dashboard.
 */
export default function AuthCallbackPage() {
  const router = useRouter();
  const { refresh, loading, user } = useSession();

  useEffect(() => {
    refresh();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!loading) {
      router.replace(user ? '/dashboard' : '/');
    }
  }, [loading, user, router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <span className="text-5xl block mb-6 animate-float">🌸</span>
        <p className="text-white/50 text-sm">Signing you in…</p>
        <div className="mt-4 flex justify-center gap-1">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="w-2 h-2 rounded-full bg-lotus-500 animate-pulse"
              style={{ animationDelay: `${i * 0.2}s` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
