'use client';

import React from 'react';

interface Channel {
  id:   string;
  name: string;
  type: number;
}

interface ChannelSelectorProps {
  label:       string;
  description?: string;
  value:       string | null;
  channels:    Channel[];
  loading?:    boolean;
  saving?:     boolean;
  onChange:    (channelId: string | null) => void;
}

export default function ChannelSelector({
  label,
  description,
  value,
  channels,
  loading = false,
  saving  = false,
  onChange,
}: ChannelSelectorProps) {
  const textChannels = channels.filter((c) => c.type === 0);

  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between">
        <label className="text-sm font-semibold text-zinc-200">{label}</label>
        {description && (
          <span className="text-xs text-zinc-600">{description}</span>
        )}
      </div>

      <div className="relative">
        <select
          value={value ?? ''}
          disabled={loading || saving}
          onChange={(e) => onChange(e.target.value || null)}
          className="select-base pr-8"
          aria-label={label}
        >
          <option value="">— None —</option>
          {textChannels.map((ch) => (
            <option key={ch.id} value={ch.id}>
              # {ch.name}
            </option>
          ))}
        </select>

        {/* Chevron icon */}
        <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </span>
      </div>
    </div>
  );
}
