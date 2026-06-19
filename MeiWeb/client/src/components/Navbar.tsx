'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSession } from '@/lib/auth';
import { authApi } from '@/lib/api';

export default function Navbar() {
  const { user, loading, logout, avatarUrl } = useSession();
  const [scrolled, setScrolled]   = useState(false);
  const [menuOpen, setMenuOpen]   = useState(false);
  const [userMenu, setUserMenu]   = useState(false);
  const userMenuRef               = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close user dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-200 ${
        scrolled
          ? 'bg-zinc-950/95 backdrop-blur-md border-b border-zinc-800'
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 flex-shrink-0">
          <span className="text-xl leading-none">🌸</span>
          <span className="font-display font-bold text-lg text-white tracking-tight">
            Mei
          </span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-1 absolute left-1/2 -translate-x-1/2">
          <Link href="/#features" className="btn-ghost">Features</Link>
          <Link href="/#leaderboard" className="btn-ghost">Leaderboard</Link>
          <a
            href="https://discord.gg/mei"
            target="_blank"
            rel="noreferrer"
            className="btn-ghost"
          >
            Support
          </a>
        </nav>

        {/* Right side */}
        <div className="hidden md:flex items-center gap-2">
          {loading ? (
            <div className="w-8 h-8 rounded-full bg-zinc-800 animate-pulse" />
          ) : user ? (
            <div className="flex items-center gap-2">
              <Link href="/dashboard" className="btn-primary">
                Dashboard
              </Link>
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setUserMenu((v) => !v)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-zinc-800 transition-colors text-sm text-zinc-300"
                >
                  {user.avatar ? (
                    <Image
                      src={avatarUrl(user, 64)}
                      alt={user.username}
                      width={26}
                      height={26}
                      className="rounded-full"
                    />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-mei-600 flex items-center justify-center text-xs font-bold text-white">
                      {user.username[0].toUpperCase()}
                    </div>
                  )}
                  <span className="font-medium">{user.username}</span>
                  <svg className="w-3.5 h-3.5 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {userMenu && (
                  <div className="absolute right-0 top-full mt-1.5 w-40 bg-zinc-900 border border-zinc-800 rounded-lg shadow-card-lg py-1 animate-fade-in">
                    <Link
                      href="/dashboard"
                      className="block px-3 py-2 text-sm text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors"
                      onClick={() => setUserMenu(false)}
                    >
                      Dashboard
                    </Link>
                    <div className="h-px bg-zinc-800 my-1" />
                    <button
                      onClick={() => { logout(); setUserMenu(false); }}
                      className="w-full text-left px-3 py-2 text-sm text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                    >
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <a href={authApi.loginUrl()} className="btn-primary">
              Login with Discord
            </a>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden p-2 rounded-lg hover:bg-zinc-800 transition-colors"
          aria-label="Toggle menu"
          onClick={() => setMenuOpen((v) => !v)}
        >
          {menuOpen ? (
            <svg className="w-5 h-5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-5 h-5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden bg-zinc-950 border-t border-zinc-800 px-4 py-3 space-y-1 animate-slide-down">
          <Link href="/#features"   onClick={() => setMenuOpen(false)} className="block py-2 text-sm text-zinc-400 hover:text-white transition-colors">Features</Link>
          <Link href="/#leaderboard" onClick={() => setMenuOpen(false)} className="block py-2 text-sm text-zinc-400 hover:text-white transition-colors">Leaderboard</Link>
          <a href="https://discord.gg/mei" target="_blank" rel="noreferrer" className="block py-2 text-sm text-zinc-400 hover:text-white transition-colors">Support</a>
          <div className="pt-2 border-t border-zinc-800">
            {user ? (
              <>
                <Link href="/dashboard" onClick={() => setMenuOpen(false)} className="block btn-primary text-center mb-2">Dashboard</Link>
                <button onClick={() => { logout(); setMenuOpen(false); }} className="block w-full btn-secondary text-center">Sign out</button>
              </>
            ) : (
              <a href={authApi.loginUrl()} className="block btn-primary text-center">Login with Discord</a>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
