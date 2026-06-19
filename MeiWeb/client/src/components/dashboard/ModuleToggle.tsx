'use client';

import React from 'react';

interface ModuleToggleProps {
  label:       string;
  description: string;
  icon:        string;
  enabled:     boolean;
  loading?:    boolean;
  saving?:     boolean;
  onChange:    (enabled: boolean) => void;
}

export default function ModuleToggle({
  label,
  description,
  icon,
  enabled,
  loading = false,
  saving  = false,
  onChange,
}: ModuleToggleProps) {
  return (
    <div className={`flex items-center justify-between gap-4 px-4 py-4 rounded-xl border transition-colors ${
      enabled
        ? 'bg-zinc-900 border-zinc-700'
        : 'bg-zinc-900/50 border-zinc-800'
    }`}>
      <div className="flex items-center gap-3 min-w-0">
        <span className="text-xl flex-shrink-0">{icon}</span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-zinc-200 leading-none mb-0.5">{label}</p>
          <p className="text-xs text-zinc-500 truncate">{description}</p>
        </div>
      </div>

      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        disabled={loading || saving}
        onClick={() => onChange(!enabled)}
        className={`relative flex-shrink-0 w-10 h-5 rounded-full transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-mei-500 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900 ${
          loading || saving
            ? 'opacity-50 cursor-not-allowed'
            : 'cursor-pointer'
        } ${enabled ? 'bg-mei-500' : 'bg-zinc-700'}`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${
            enabled ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
}
