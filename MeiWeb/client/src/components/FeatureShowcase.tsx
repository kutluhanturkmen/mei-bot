'use client';

import React, { useState } from 'react';

const FEATURES = [
  {
    emoji: '🪙',
    title: 'Economy System',
    description:
      'Daily rewards, work commands, trivia earnings, and a fully-featured Lotus Coin economy. Buy backgrounds, badges, and premium perks.',
    tag: 'Economy',
  },
  {
    emoji: '☕',
    title: 'Cat Café',
    description:
      'Open your own virtual cat café. Hire cats, collect income, upgrade tiers, and compete on the global café leaderboard.',
    tag: 'Games',
  },
  {
    emoji: '🎮',
    title: 'Mini Games',
    description:
      'CatFight tournaments, Truth or Dare, Guess the Number, Make-a-Sentence — keep your community entertained.',
    tag: 'Games',
  },
  {
    emoji: '🎉',
    title: 'Giveaways',
    description:
      'Create time-limited giveaways with one command. Entries tracked in real-time, automatic winner selection, reroll support.',
    tag: 'Utility',
  },
  {
    emoji: '🎨',
    title: 'Web Dashboard',
    description:
      'Manage every bot setting from a clean web interface. Toggle modules, set channels, customize welcome cards — no commands needed.',
    tag: 'Dashboard',
  },
  {
    emoji: '🎀',
    title: 'Profile Cards',
    description:
      'Canvas-rendered profile cards with custom backgrounds, badges, café stats, and more. Personalize your identity.',
    tag: 'Profiles',
  },
  {
    emoji: '🛡️',
    title: 'Server Management',
    description:
      'Toggle economy, games, and logging modules independently. Set dedicated game channels and welcome messages.',
    tag: 'Utility',
  },
  {
    emoji: '⭐',
    title: 'Premium — Mei Club',
    description:
      'Unlock server economy multipliers, exclusive backgrounds, premium café bonuses, and priority support.',
    tag: 'Premium',
  },
];

const TAG_COLORS: Record<string, string> = {
  Economy:   'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  Games:     'bg-violet-500/10 text-violet-400 border-violet-500/20',
  Utility:   'bg-blue-500/10  text-blue-400  border-blue-500/20',
  Dashboard: 'bg-mei-500/10   text-mei-400   border-mei-500/20',
  Profiles:  'bg-pink-500/10  text-pink-400  border-pink-500/20',
  Premium:   'bg-amber-500/10 text-amber-400 border-amber-500/20',
};

export default function FeatureShowcase() {
  const [active, setActive] = useState<string | null>(null);

  const tags = Array.from(new Set(FEATURES.map((f) => f.tag)));
  const shown = active ? FEATURES.filter((f) => f.tag === active) : FEATURES;

  return (
    <section id="features" className="py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">

        {/* Header */}
        <div className="max-w-2xl mb-12">
          <p className="text-mei-500 text-sm font-semibold uppercase tracking-wider mb-3">Features</p>
          <h2 className="font-display text-4xl sm:text-5xl font-bold text-white mb-4 leading-tight">
            Everything your server needs
          </h2>
          <p className="text-zinc-400 text-lg">
            A complete community toolkit — economy, games, utilities, and a dashboard to control it all.
          </p>
        </div>

        {/* Tag filter */}
        <div className="flex flex-wrap gap-2 mb-8">
          <button
            onClick={() => setActive(null)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
              active === null
                ? 'bg-zinc-700 text-white border-zinc-600'
                : 'bg-transparent text-zinc-500 border-zinc-700 hover:text-zinc-300'
            }`}
          >
            All
          </button>
          {tags.map((tag) => (
            <button
              key={tag}
              onClick={() => setActive(active === tag ? null : tag)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                active === tag
                  ? TAG_COLORS[tag]
                  : 'bg-transparent text-zinc-500 border-zinc-700 hover:text-zinc-300'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>

        {/* Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-px bg-zinc-800 rounded-2xl overflow-hidden border border-zinc-800">
          {shown.map((feat) => (
            <div
              key={feat.title}
              className="bg-zinc-950 hover:bg-zinc-900 transition-colors p-6 group"
            >
              <span className="text-3xl mb-4 block">{feat.emoji}</span>
              <div className="flex items-start justify-between gap-2 mb-2">
                <h3 className="font-display font-bold text-base text-white leading-snug">
                  {feat.title}
                </h3>
                <span className={`flex-shrink-0 text-[10px] px-2 py-0.5 rounded-full border font-semibold ${TAG_COLORS[feat.tag]}`}>
                  {feat.tag}
                </span>
              </div>
              <p className="text-zinc-500 text-sm leading-relaxed group-hover:text-zinc-400 transition-colors">
                {feat.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
