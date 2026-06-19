'use client';

import React from 'react';
import Link from 'next/link';
import { authApi } from '@/lib/api';
import { useSession } from '@/lib/auth';

// Simulated Discord-style bot command preview
function BotPreview() {
  return (
    <div className="w-full max-w-sm mx-auto select-none pointer-events-none">
      {/* Discord-like chat window */}
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden shadow-card-lg">
        {/* Channel header */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-zinc-800 bg-zinc-900">
          <span className="text-zinc-500 text-sm font-medium"># general</span>
        </div>

        {/* Messages */}
        <div className="px-4 py-4 space-y-4">
          {/* User message */}
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-indigo-600 flex-shrink-0 flex items-center justify-center text-xs font-bold text-white">U</div>
            <div>
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-sm font-semibold text-zinc-200">username</span>
                <span className="text-2xs text-zinc-600">Today at 14:20</span>
              </div>
              <span className="text-sm text-zinc-300">/profile</span>
            </div>
          </div>

          {/* Bot embed response */}
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-mei-500 flex-shrink-0 flex items-center justify-center text-xs font-bold text-white">🌸</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-sm font-semibold text-mei-400">Mei</span>
                <span className="text-2xs bg-mei-900/50 text-mei-300 text-[10px] px-1.5 py-0.5 rounded font-medium">BOT</span>
                <span className="text-2xs text-zinc-600">Today at 14:20</span>
              </div>
              {/* Embed card */}
              <div className="bg-zinc-800 rounded-lg border-l-2 border-mei-500 p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-mei-400 to-mei-600 flex items-center justify-center text-sm">🐱</div>
                  <div>
                    <p className="text-sm font-semibold text-zinc-200">username</p>
                    <p className="text-xs text-zinc-500">Member since 2023</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 pt-1">
                  {[
                    { label: 'Balance', value: '4,200 🪙' },
                    { label: 'Café Lvl', value: 'Tier 3 ☕' },
                    { label: 'Wins', value: '12 🏆' },
                  ].map((stat) => (
                    <div key={stat.label} className="bg-zinc-700/60 rounded px-2 py-1.5 text-center">
                      <p className="text-[10px] text-zinc-500 mb-0.5">{stat.label}</p>
                      <p className="text-xs font-semibold text-zinc-200">{stat.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Another command */}
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-violet-600 flex-shrink-0 flex items-center justify-center text-xs font-bold text-white">A</div>
            <div>
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-sm font-semibold text-zinc-200">another_user</span>
                <span className="text-2xs text-zinc-600">Today at 14:21</span>
              </div>
              <span className="text-sm text-zinc-300">/daily</span>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-mei-500 flex-shrink-0 flex items-center justify-center text-xs font-bold text-white">🌸</div>
            <div>
              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-sm font-semibold text-mei-400">Mei</span>
                <span className="text-2xs bg-mei-900/50 text-mei-300 text-[10px] px-1.5 py-0.5 rounded font-medium">BOT</span>
              </div>
              <div className="bg-zinc-800 rounded-lg border-l-2 border-green-500 p-3">
                <p className="text-sm text-zinc-200">🪙 You received <span className="text-green-400 font-semibold">+250 Lotus Coins</span>!</p>
                <p className="text-xs text-zinc-500 mt-0.5">Come back tomorrow for more.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function HeroSection() {
  const { user } = useSession();

  return (
    <section className="relative min-h-screen flex items-center pt-16 overflow-hidden">
      {/* Subtle background gradient */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute -top-32 left-1/2 -translate-x-1/2 w-[800px] h-[500px] opacity-20"
          style={{
            background: 'radial-gradient(ellipse at center, #e8497a 0%, transparent 65%)',
            filter: 'blur(60px)',
          }}
        />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 w-full py-20">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">

          {/* Left — text */}
          <div>
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-zinc-800 border border-zinc-700 rounded-full px-3.5 py-1.5 text-xs font-medium text-zinc-300 mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
              Now live in thousands of servers
            </div>

            <h1 className="font-display text-5xl sm:text-6xl font-extrabold mb-5 leading-[1.1] tracking-tight text-white">
              The Discord bot
              <br />
              <span className="text-gradient">your community</span>
              <br />
              deserves
            </h1>

            <p className="text-zinc-400 text-lg leading-relaxed mb-8 max-w-lg">
              Economy, cat café, mini games, giveaways, and a full web dashboard.
              Built to make your server more engaging.
            </p>

            {/* CTA */}
            <div className="flex flex-col sm:flex-row gap-3 mb-10">
              <a
                href="https://discord.com/oauth2/authorize?client_id=CLIENT_ID&scope=bot+applications.commands&permissions=277025770560"
                target="_blank"
                rel="noreferrer"
                className="btn-primary text-base px-6 py-3 inline-flex items-center justify-center gap-2"
              >
                <span>Add to Discord</span>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </a>
              {user ? (
                <Link href="/dashboard" className="btn-secondary text-base px-6 py-3 inline-flex items-center justify-center gap-2">
                  Open Dashboard
                </Link>
              ) : (
                <a href={authApi.loginUrl()} className="btn-secondary text-base px-6 py-3 inline-flex items-center justify-center gap-2">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.002.022.015.043.031.054a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z" />
                  </svg>
                  Login with Discord
                </a>
              )}
            </div>

            {/* Trust stats */}
            <div className="flex flex-wrap gap-6 text-sm text-zinc-500">
              {[
                { value: '500+', label: 'servers' },
                { value: '10K+', label: 'users' },
                { value: 'Free', label: 'to use' },
              ].map((s) => (
                <div key={s.label} className="flex items-center gap-1.5">
                  <span className="font-semibold text-zinc-200">{s.value}</span>
                  <span>{s.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right — preview */}
          <div className="hidden lg:flex justify-end">
            <BotPreview />
          </div>
        </div>
      </div>
    </section>
  );
}
