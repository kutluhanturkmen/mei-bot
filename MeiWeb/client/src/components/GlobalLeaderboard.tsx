'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { leaderboardApi, type LeaderboardEntry } from '@/lib/api';

const TABS = [
  { key: 'coins', label: 'Coins' },
  { key: 'cafe',  label: 'Cat Café' },
] as const;

type Tab = (typeof TABS)[number]['key'];

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return <span className="text-base">🥇</span>;
  if (rank === 2) return <span className="text-base">🥈</span>;
  if (rank === 3) return <span className="text-base">🥉</span>;
  return <span className="text-xs font-mono text-zinc-500 tabular-nums w-5 text-right">{rank}</span>;
}

function EntryRow({ entry, index }: { entry: LeaderboardEntry; index: number }) {
  const avatarSrc = entry.avatar
    ? `https://cdn.discordapp.com/avatars/${entry.userId}/${entry.avatar}.webp?size=64`
    : `https://cdn.discordapp.com/embed/avatars/${index % 5}.png`;

  const raw = entry.value ?? 0;
  const valueDisplay =
    raw >= 1_000_000
      ? `${(raw / 1_000_000).toFixed(1)}M`
      : raw >= 1_000
      ? `${(raw / 1_000).toFixed(1)}K`
      : raw.toLocaleString();

  return (
    <div className={`flex items-center gap-3 px-4 py-3 transition-colors ${
      index === 0 ? 'bg-amber-500/5 border-l-2 border-amber-500' :
      index === 1 ? 'bg-zinc-400/5 border-l-2 border-zinc-400' :
      index === 2 ? 'bg-orange-700/5 border-l-2 border-orange-700' :
      'hover:bg-zinc-800/50 border-l-2 border-transparent'
    }`}>
      <div className="w-6 flex items-center justify-end flex-shrink-0">
        <RankBadge rank={entry.rank} />
      </div>

      <div className="relative w-7 h-7 rounded-full overflow-hidden flex-shrink-0">
        <Image src={avatarSrc} alt={entry.username} fill className="object-cover" unoptimized />
      </div>

      <span className="flex-1 text-sm font-medium text-zinc-200 truncate">
        {entry.username}
        {entry.isEarlySupporter && (
          <span className="ml-1.5 text-[10px] text-mei-400 font-semibold">🌟</span>
        )}
      </span>

      <span className="text-sm font-semibold text-mei-400 tabular-nums font-mono">
        {valueDisplay}
      </span>
    </div>
  );
}

function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <div className="w-6 h-4 rounded shimmer bg-zinc-800" />
      <div className="w-7 h-7 rounded-full shimmer bg-zinc-800" />
      <div className="flex-1 h-4 rounded shimmer bg-zinc-800" style={{ maxWidth: '60%' }} />
      <div className="w-14 h-4 rounded shimmer bg-zinc-800" />
    </div>
  );
}

export default function GlobalLeaderboard() {
  const [activeTab, setActiveTab] = useState<Tab>('coins');
  const [data, setData] = useState<Record<Tab, LeaderboardEntry[] | null>>({ coins: null, cafe: null });

  useEffect(() => {
    if (data[activeTab]) return;
    leaderboardApi
      .get(activeTab, 10)
      .then((entries) => setData((prev) => ({ ...prev, [activeTab]: entries })))
      .catch(() => setData((prev) => ({ ...prev, [activeTab]: [] })));
  }, [activeTab, data]);

  const entries = data[activeTab];

  return (
    <section id="leaderboard" className="py-24 border-t border-zinc-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="grid lg:grid-cols-2 gap-12 items-start">

          {/* Left — heading */}
          <div>
            <p className="text-mei-500 text-sm font-semibold uppercase tracking-wider mb-3">Leaderboard</p>
            <h2 className="font-display text-4xl sm:text-5xl font-bold text-white mb-4 leading-tight">
              Top players<br />across all servers
            </h2>
            <p className="text-zinc-400 text-lg mb-8">
              Compete globally in coins or build the best cat café. Rankings update every hour.
            </p>

            {/* Tab switcher */}
            <div className="inline-flex bg-zinc-900 border border-zinc-800 rounded-lg p-1 gap-1">
              {TABS.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-150 ${
                    activeTab === tab.key
                      ? 'bg-mei-500 text-white shadow-mei-sm'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Right — table */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
              <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                {activeTab === 'coins' ? 'Balance' : 'Café Earnings'}
              </span>
              <span className="text-xs text-zinc-600">Global</span>
            </div>

            <div className="divide-y divide-zinc-800/60">
              {entries === null
                ? Array.from({ length: 10 }, (_, i) => <SkeletonRow key={i} />)
                : entries.length === 0
                ? (
                  <div className="text-center py-16 text-zinc-500 text-sm">
                    No data available yet.
                  </div>
                )
                : entries.map((entry, i) => (
                    <EntryRow key={entry.userId} entry={entry} index={i} />
                  ))
              }
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
