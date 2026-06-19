'use client';

import React, { useEffect, useState } from 'react';
import { statsApi, type BotStats } from '@/lib/api';

function StatItem({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="text-center px-6 py-4">
      <div className="font-display font-bold text-4xl sm:text-5xl text-white mb-1 tabular-nums">
        {value === null ? (
          <span className="inline-block w-24 h-10 rounded-lg shimmer bg-zinc-800" />
        ) : (
          value
        )}
      </div>
      <p className="text-zinc-500 text-sm font-medium">{label}</p>
    </div>
  );
}

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

export default function LiveStats() {
  const [stats, setStats] = useState<BotStats | null>(null);

  useEffect(() => {
    statsApi.get().then(setStats).catch(() => {});
    const id = setInterval(() => statsApi.get().then(setStats).catch(() => {}), 60_000);
    return () => clearInterval(id);
  }, []);

  return (
    <section className="border-y border-zinc-800 bg-zinc-900/50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-zinc-800">
          <StatItem
            label="Servers"
            value={stats ? fmt(stats.guilds) : null}
          />
          <StatItem
            label="Registered Users"
            value={stats ? fmt(stats.users) : null}
          />
          <StatItem
            label="Lotus Coins Earned"
            value={stats ? fmt(stats.lotusCoins ?? 0) : null}
          />
          <StatItem
            label="Uptime"
            value={stats ? `${Math.floor((stats.uptime ?? 0) / 3600)}h` : null}
          />
        </div>
      </div>
    </section>
  );
}
