'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import ServerCard from '@/components/dashboard/ServerCard';
import { useSession } from '@/lib/auth';
import { guildsApi, authApi, type Guild } from '@/lib/api';

export default function DashboardPage() {
  const { user, loading: authLoading } = useSession();
  const router = useRouter();
  const [guilds, setGuilds]   = useState<Guild[] | null>(null);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) router.replace('/');
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!user) return;
    guildsApi
      .list()
      .then(setGuilds)
      .catch((e) => setError(e.message ?? 'Failed to load servers'));
  }, [user]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <span className="text-3xl opacity-60">🌸</span>
      </div>
    );
  }

  if (!user) return null;

  const botGuilds    = guilds?.filter((g) => g.hasBot)  ?? [];
  const inviteGuilds = guilds?.filter((g) => !g.hasBot) ?? [];

  return (
    <div className="min-h-screen bg-zinc-950">
      <Navbar />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-24 pb-16">
        {/* Page header */}
        <div className="mb-8">
          <h1 className="font-display text-2xl font-bold text-white mb-1">
            Your Servers
          </h1>
          <p className="text-zinc-500 text-sm">
            Select a server to manage Mei&apos;s settings
          </p>
        </div>

        {error && (
          <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-sm text-red-400 mb-6">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M12 5a7 7 0 110 14A7 7 0 0112 5z" />
            </svg>
            {error}
          </div>
        )}

        {guilds === null ? (
          /* Skeleton */
          <div className="space-y-2">
            {Array.from({ length: 5 }, (_, i) => (
              <div key={i} className="flex items-center gap-4 px-4 py-3.5 rounded-xl bg-zinc-900 border border-zinc-800">
                <div className="w-11 h-11 rounded-full shimmer bg-zinc-800 flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 w-1/3 rounded shimmer bg-zinc-800" />
                  <div className="h-3 w-1/5 rounded shimmer bg-zinc-800" />
                </div>
                <div className="w-20 h-8 rounded-lg shimmer bg-zinc-800" />
              </div>
            ))}
          </div>
        ) : guilds.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-zinc-500 text-sm mb-4">
              No servers found where you have admin permissions.
            </p>
            <a href={authApi.loginUrl()} className="btn-secondary inline-block">
              Re-authenticate
            </a>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Servers with bot */}
            {botGuilds.length > 0 && (
              <section>
                <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">
                  Manage ({botGuilds.length})
                </p>
                <div className="space-y-2">
                  {botGuilds.map((g) => <ServerCard key={g.id} guild={g} />)}
                </div>
              </section>
            )}

            {/* Servers without bot */}
            {inviteGuilds.length > 0 && (
              <section>
                <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">
                  Add Mei ({inviteGuilds.length})
                </p>
                <div className="space-y-2">
                  {inviteGuilds.map((g) => <ServerCard key={g.id} guild={g} />)}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
