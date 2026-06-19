'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import ModuleToggle from '@/components/dashboard/ModuleToggle';
import ChannelSelector from '@/components/dashboard/ChannelSelector';
import WelcomeCardCustomizer from '@/components/dashboard/WelcomeCardCustomizer';
import { useSession } from '@/lib/auth';
import { guildApi, type GuildSettings } from '@/lib/api';

const MOCK_CHANNELS = [
  { id: '111', name: 'general',       type: 0 },
  { id: '222', name: 'welcome',       type: 0 },
  { id: '333', name: 'announcements', type: 0 },
  { id: '444', name: 'games',         type: 0 },
  { id: '555', name: 'logs',          type: 0 },
  { id: '666', name: 'giveaways',     type: 0 },
];

const NAV_ITEMS = [
  { id: 'overview',  label: 'Overview',        icon: '⚡' },
  { id: 'modules',   label: 'Modules',         icon: '🧩' },
  { id: 'channels',  label: 'Channels',        icon: '📢' },
  { id: 'welcome',   label: 'Welcome Card',    icon: '👋' },
] as const;

type NavId = (typeof NAV_ITEMS)[number]['id'];
type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

// ── Toast-style save indicator ─────────────────────────────────────
function SaveIndicator({ status }: { status: SaveStatus }) {
  if (status === 'idle') return null;
  return (
    <div className={`fixed bottom-5 right-5 z-50 flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-medium shadow-card-lg animate-fade-in border ${
      status === 'saving' ? 'bg-zinc-800 border-zinc-700 text-zinc-300' :
      status === 'saved'  ? 'bg-green-900/60 border-green-700/50 text-green-300' :
                            'bg-red-900/60 border-red-700/50 text-red-300'
    }`}>
      {status === 'saving' && <span className="w-3.5 h-3.5 border-2 border-zinc-500 border-t-zinc-200 rounded-full animate-spin" />}
      {status === 'saving' && 'Saving…'}
      {status === 'saved'  && <><span>✓</span> Saved</>}
      {status === 'error'  && <><span>✗</span> Failed to save</>}
    </div>
  );
}

// ── Section card ───────────────────────────────────────────────────
function Section({ title, description, children }: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-zinc-800">
        <h3 className="font-semibold text-sm text-zinc-200">{title}</h3>
        {description && <p className="text-xs text-zinc-500 mt-0.5">{description}</p>}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

export default function GuildDashboardPage() {
  const { guildId }               = useParams<{ guildId: string }>();
  const router                    = useRouter();
  const { user, loading: authLoading } = useSession();

  const [settings, setSettings]   = useState<GuildSettings | null>(null);
  const [draft, setDraft]         = useState<GuildSettings | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveStatus, setSave]     = useState<SaveStatus>('idle');
  const [activeNav, setActiveNav] = useState<NavId>('overview');
  const [sidebarOpen, setSidebar] = useState(false);

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!authLoading && !user) router.replace('/');
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!user || !guildId) return;
    guildApi.get(guildId)
      .then((data) => { setSettings(data); setDraft(data); })
      .catch((e) => setLoadError(e.message ?? 'Could not load settings'));
  }, [user, guildId]);

  const save = useCallback(async (data: GuildSettings) => {
    setSave('saving');
    try {
      const updated = await guildApi.patch(guildId, data);
      setSettings(updated);
      setSave('saved');
      setTimeout(() => setSave('idle'), 2000);
    } catch {
      setSave('error');
      toast.error('Failed to save settings');
      setTimeout(() => setSave('idle'), 3000);
    }
  }, [guildId]);

  const handleChange = useCallback((updater: (prev: GuildSettings) => GuildSettings) => {
    setDraft((prev) => {
      if (!prev) return prev;
      const next = updater(prev);
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => save(next), 800);
      return next;
    });
  }, [save]);

  // ── Loading ────────────────────────────────────────────────────────
  if (authLoading || (!draft && !loadError)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <span className="text-3xl opacity-60">🌸</span>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950 px-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 text-center max-w-sm">
          <p className="text-zinc-400 text-sm mb-5">{loadError}</p>
          <Link href="/dashboard" className="btn-secondary text-sm">
            ← Back to servers
          </Link>
        </div>
      </div>
    );
  }

  if (!draft) return null;

  // ── Sidebar nav ────────────────────────────────────────────────────
  const Sidebar = (
    <nav className="flex flex-col gap-0.5">
      {NAV_ITEMS.map((item) => (
        <button
          key={item.id}
          onClick={() => { setActiveNav(item.id); setSidebar(false); }}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-left transition-colors ${
            activeNav === item.id
              ? 'bg-mei-500/10 text-mei-400'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
          }`}
        >
          <span className="text-base w-5 text-center">{item.icon}</span>
          {item.label}
        </button>
      ))}
    </nav>
  );

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col">

      {/* ── Top bar ── */}
      <header className="h-14 border-b border-zinc-800 bg-zinc-950 flex items-center px-4 sm:px-6 gap-4 sticky top-0 z-40">
        {/* Mobile sidebar toggle */}
        <button
          className="md:hidden p-1.5 rounded-lg hover:bg-zinc-800 transition-colors text-zinc-400"
          onClick={() => setSidebar((v) => !v)}
          aria-label="Toggle sidebar"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm min-w-0">
          <Link href="/dashboard" className="text-zinc-500 hover:text-zinc-300 transition-colors flex-shrink-0">
            Dashboard
          </Link>
          <span className="text-zinc-700">/</span>
          <span className="text-zinc-300 font-medium truncate">{draft.guildName}</span>
          {draft.isEarlySupporter && (
            <span className="flex-shrink-0 text-[10px] bg-mei-500/10 text-mei-400 border border-mei-500/20 px-1.5 py-0.5 rounded font-semibold">
              🌟 Early Supporter
            </span>
          )}
        </div>

        <div className="ml-auto flex items-center gap-3">
          {saveStatus === 'saving' && (
            <span className="text-xs text-zinc-500 flex items-center gap-1.5">
              <span className="w-3 h-3 border-2 border-zinc-600 border-t-zinc-400 rounded-full animate-spin" />
              Saving…
            </span>
          )}
          {saveStatus === 'saved' && (
            <span className="text-xs text-green-500">✓ Saved</span>
          )}
        </div>
      </header>

      <div className="flex flex-1 relative">

        {/* ── Sidebar (desktop) ── */}
        <aside className="hidden md:flex flex-col w-56 flex-shrink-0 border-r border-zinc-800 bg-zinc-950 p-4 sticky top-14 h-[calc(100vh-3.5rem)] overflow-y-auto">
          <p className="text-2xs font-semibold text-zinc-600 uppercase tracking-wider px-3 mb-2">
            Settings
          </p>
          {Sidebar}
        </aside>

        {/* ── Mobile sidebar overlay ── */}
        {sidebarOpen && (
          <>
            <div
              className="md:hidden fixed inset-0 bg-black/60 z-30"
              onClick={() => setSidebar(false)}
            />
            <aside className="md:hidden fixed left-0 top-14 bottom-0 w-56 bg-zinc-950 border-r border-zinc-800 p-4 z-40 overflow-y-auto animate-slide-down">
              {Sidebar}
            </aside>
          </>
        )}

        {/* ── Main content ── */}
        <main className="flex-1 p-6 max-w-3xl">
          <div className="space-y-5">

            {/* OVERVIEW */}
            {activeNav === 'overview' && (
              <>
                <div className="mb-6">
                  <h1 className="font-display text-xl font-bold text-white mb-1">Overview</h1>
                  <p className="text-zinc-500 text-sm">Quick summary of {draft.guildName}&apos;s configuration.</p>
                </div>

                <div className="grid sm:grid-cols-3 gap-3">
                  {[
                    { label: 'Economy',   value: draft.settings.economyEnabled ? 'Enabled' : 'Disabled',   ok: draft.settings.economyEnabled },
                    { label: 'Games',     value: draft.settings.gamesEnabled   ? 'Enabled' : 'Disabled',   ok: draft.settings.gamesEnabled   },
                    { label: 'Logs',      value: draft.settings.logsEnabled    ? 'Enabled' : 'Disabled',   ok: draft.settings.logsEnabled    },
                  ].map((item) => (
                    <div key={item.label} className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 flex items-center justify-between">
                      <span className="text-sm text-zinc-400">{item.label}</span>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                        item.ok
                          ? 'bg-green-500/10 text-green-400'
                          : 'bg-zinc-700 text-zinc-500'
                      }`}>
                        {item.value}
                      </span>
                    </div>
                  ))}
                </div>

                <Section title="Quick actions" description="Jump to common settings">
                  <div className="grid sm:grid-cols-2 gap-2">
                    {NAV_ITEMS.filter((n) => n.id !== 'overview').map((item) => (
                      <button
                        key={item.id}
                        onClick={() => setActiveNav(item.id)}
                        className="flex items-center gap-3 px-4 py-3 rounded-lg bg-zinc-800 hover:bg-zinc-700 transition-colors text-sm text-zinc-300 text-left"
                      >
                        <span>{item.icon}</span>
                        {item.label}
                        <svg className="w-3.5 h-3.5 ml-auto text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    ))}
                  </div>
                </Section>
              </>
            )}

            {/* MODULES */}
            {activeNav === 'modules' && (
              <>
                <div className="mb-6">
                  <h1 className="font-display text-xl font-bold text-white mb-1">Modules</h1>
                  <p className="text-zinc-500 text-sm">Enable or disable major bot features for this server.</p>
                </div>
                <Section title="Bot Modules">
                  <div className="space-y-2">
                    <ModuleToggle
                      icon="🪙" label="Economy" description="Daily, work, trivia, shop and Lotus Coins"
                      enabled={draft.settings.economyEnabled} saving={saveStatus === 'saving'}
                      onChange={(v) => handleChange((p) => ({ ...p, settings: { ...p.settings, economyEnabled: v } }))}
                    />
                    <ModuleToggle
                      icon="🎮" label="Games" description="CatFight, word games, truth or dare"
                      enabled={draft.settings.gamesEnabled} saving={saveStatus === 'saving'}
                      onChange={(v) => handleChange((p) => ({ ...p, settings: { ...p.settings, gamesEnabled: v } }))}
                    />
                    <ModuleToggle
                      icon="📋" label="Logs" description="Member join/leave and action logs"
                      enabled={draft.settings.logsEnabled} saving={saveStatus === 'saving'}
                      onChange={(v) => handleChange((p) => ({ ...p, settings: { ...p.settings, logsEnabled: v } }))}
                    />
                  </div>
                </Section>
              </>
            )}

            {/* CHANNELS */}
            {activeNav === 'channels' && (
              <>
                <div className="mb-6">
                  <h1 className="font-display text-xl font-bold text-white mb-1">Channels</h1>
                  <p className="text-zinc-500 text-sm">Set dedicated channels for each feature.</p>
                </div>
                <Section title="Channel Settings">
                  <div className="grid sm:grid-cols-2 gap-5">
                    <ChannelSelector
                      label="Welcome Channel" description="Where welcome cards are sent"
                      value={draft.channels.welcome} channels={MOCK_CHANNELS} saving={saveStatus === 'saving'}
                      onChange={(v) => handleChange((p) => ({ ...p, channels: { ...p.channels, welcome: v } }))}
                    />
                    <ChannelSelector
                      label="Join Log Channel" description="Member join/leave events"
                      value={draft.channels.joinLog} channels={MOCK_CHANNELS} saving={saveStatus === 'saving'}
                      onChange={(v) => handleChange((p) => ({ ...p, channels: { ...p.channels, joinLog: v } }))}
                    />
                    <ChannelSelector
                      label="Giveaway Log Channel" description="Giveaway start/end events"
                      value={draft.channels.giveawayLog} channels={MOCK_CHANNELS} saving={saveStatus === 'saving'}
                      onChange={(v) => handleChange((p) => ({ ...p, channels: { ...p.channels, giveawayLog: v } }))}
                    />
                    <ChannelSelector
                      label="Games Channel" description="Restrict game commands to this channel"
                      value={draft.settings.gameChannelId} channels={MOCK_CHANNELS} saving={saveStatus === 'saving'}
                      onChange={(v) => handleChange((p) => ({ ...p, settings: { ...p.settings, gameChannelId: v } }))}
                    />
                  </div>
                </Section>
              </>
            )}

            {/* WELCOME CARD */}
            {activeNav === 'welcome' && (
              <>
                <div className="mb-6">
                  <h1 className="font-display text-xl font-bold text-white mb-1">Welcome Card</h1>
                  <p className="text-zinc-500 text-sm">Customize the message sent when new members join.</p>
                </div>
                <Section title="Welcome Message">
                  <WelcomeCardCustomizer
                    config={{ enabled: draft.welcomeMessage.enabled, template: draft.welcomeMessage.template }}
                    saving={saveStatus === 'saving'}
                    onChange={({ enabled, template }) =>
                      handleChange((p) => ({ ...p, welcomeMessage: { ...p.welcomeMessage, enabled, template } }))
                    }
                  />
                </Section>
              </>
            )}
          </div>
        </main>
      </div>

      <SaveIndicator status={saveStatus} />
    </div>
  );
}
