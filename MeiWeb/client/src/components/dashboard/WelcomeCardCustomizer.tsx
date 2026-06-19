'use client';

import React, { useState } from 'react';

interface WelcomeCardConfig {
  enabled: boolean;
  template: string;
}

interface WelcomeCardCustomizerProps {
  config: WelcomeCardConfig;
  saving?: boolean;
  onChange: (config: WelcomeCardConfig) => void;
}

const VARIABLES = [
  { tag: '{user}', desc: "Member's username" },
  { tag: '{server}', desc: 'Server name' },
  { tag: '{count}', desc: 'Member count' },
  { tag: '{mention}', desc: 'Mention the user' },
];

const TEMPLATES = [
  'Welcome to {server}, {user}! You are member #{count} 🌸',
  'Hey {mention}, glad you joined {server}! 🎉',
  '✨ {user} just landed in {server} — welcome aboard!',
];

export default function WelcomeCardCustomizer({
  config,
  saving = false,
  onChange,
}: WelcomeCardCustomizerProps) {
  const [preview, setPreview] = useState(false);

  const previewText = config.template
    .replace('{user}', 'SakuraCat')
    .replace('{server}', 'Mei World')
    .replace('{count}', '1,337')
    .replace('{mention}', '@SakuraCat');

  return (
    <div className="space-y-5">
      {/* Toggle */}
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-semibold text-white text-sm">Welcome Messages</h4>
          <p className="text-white/40 text-xs mt-0.5">
            Send a card when a new member joins
          </p>
        </div>
        <button
          role="switch"
          aria-checked={config.enabled}
          aria-label="Toggle welcome messages"
          disabled={saving}
          onClick={() => onChange({ ...config, enabled: !config.enabled })}
          className={`relative w-11 h-6 rounded-full transition-colors duration-200
            ${saving ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            ${config.enabled ? 'bg-lotus-500' : 'bg-white/15'}`}
        >
          <span
            className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200
              ${config.enabled ? 'translate-x-5' : 'translate-x-0'}`}
          />
        </button>
      </div>

      {config.enabled && (
        <>
          {/* Template input */}
          <div>
            <label className="text-sm font-medium text-white/80 block mb-2">
              Message Template
            </label>
            <textarea
              value={config.template}
              disabled={saving}
              onChange={(e) =>
                onChange({ ...config, template: e.target.value })
              }
              rows={3}
              maxLength={256}
              placeholder="Welcome to {server}, {user}!"
              className="w-full glass rounded-xl px-4 py-3 text-sm text-white bg-transparent
                border border-white/10 hover:border-white/20 focus:border-lotus-500/50
                focus:ring-1 focus:ring-lotus-500/30 focus:outline-none
                resize-none transition-colors placeholder:text-white/30
                disabled:opacity-50"
            />
            <p className="text-white/30 text-xs mt-1 text-right">
              {config.template.length}/256
            </p>
          </div>

          {/* Quick templates */}
          <div>
            <p className="text-xs text-white/50 mb-2 font-medium">
              Quick templates
            </p>
            <div className="flex flex-col gap-1.5">
              {TEMPLATES.map((tpl) => (
                <button
                  key={tpl}
                  onClick={() => onChange({ ...config, template: tpl })}
                  className="text-left text-xs text-white/60 hover:text-white glass rounded-lg px-3 py-2 transition-colors hover:border-lotus-500/20 border border-transparent"
                >
                  {tpl}
                </button>
              ))}
            </div>
          </div>

          {/* Variables reference */}
          <div className="glass rounded-xl p-4">
            <p className="text-xs text-white/50 mb-3 font-medium uppercase tracking-wider">
              Available Variables
            </p>
            <div className="grid grid-cols-2 gap-2">
              {VARIABLES.map((v) => (
                <button
                  key={v.tag}
                  onClick={() =>
                    onChange({
                      ...config,
                      template: config.template + v.tag,
                    })
                  }
                  className="text-left p-2 rounded-lg hover:bg-white/5 transition-colors"
                >
                  <code className="text-lotus-400 text-xs font-mono">{v.tag}</code>
                  <p className="text-white/40 text-xs mt-0.5">{v.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Preview */}
          <div>
            <button
              onClick={() => setPreview((v) => !v)}
              className="text-xs text-lotus-400 hover:text-lotus-300 transition-colors font-medium"
            >
              {preview ? '▲ Hide' : '▼ Show'} preview
            </button>
            {preview && (
              <div className="mt-3 glass-lotus rounded-xl p-4 text-sm text-white/80 animate-fade-in">
                <span className="text-white/30 text-xs block mb-1">Preview:</span>
                {previewText}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
