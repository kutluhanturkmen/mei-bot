'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { type Guild } from '@/lib/api';

function GuildIcon({ guild }: { guild: Guild }) {
  const iconUrl = guild.icon
    ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.webp?size=128`
    : null;

  const initials = guild.name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="relative w-11 h-11 rounded-full overflow-hidden flex-shrink-0">
      {iconUrl ? (
        <Image src={iconUrl} alt={guild.name} fill className="object-cover" unoptimized />
      ) : (
        <div className="w-full h-full bg-mei-800 flex items-center justify-center font-display font-bold text-sm text-mei-200">
          {initials}
        </div>
      )}
    </div>
  );
}

export default function ServerCard({ guild }: { guild: Guild }) {
  return (
    <div className="flex items-center gap-4 px-4 py-3.5 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-colors group">
      <GuildIcon guild={guild} />

      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-sm text-zinc-200 truncate group-hover:text-white transition-colors">
          {guild.name}
        </h3>
        <p className="text-zinc-600 text-xs mt-0.5">
          {guild.owner ? 'Owner' : 'Administrator'}
        </p>
      </div>

      {guild.hasBot ? (
        <Link
          href={`/dashboard/${guild.id}`}
          className="btn-primary flex-shrink-0 py-1.5 px-4"
        >
          Manage
        </Link>
      ) : (
        <a
          href={`https://discord.com/oauth2/authorize?client_id=${process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID}&guild_id=${guild.id}&scope=bot+applications.commands&permissions=277025770560`}
          target="_blank"
          rel="noreferrer"
          className="flex-shrink-0 text-xs font-semibold text-zinc-500 hover:text-mei-400 border border-zinc-700 hover:border-mei-500/40 px-4 py-1.5 rounded-lg transition-colors"
        >
          + Add Mei
        </a>
      )}
    </div>
  );
}
