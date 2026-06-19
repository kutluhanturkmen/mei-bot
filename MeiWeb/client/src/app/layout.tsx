import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/lib/auth';
import { Toaster } from 'react-hot-toast';

export const metadata: Metadata = {
  title: {
    default: 'Mei Bot — Aesthetic Discord Community Bot',
    template: '%s | Mei Bot',
  },
  description:
    'Mei is a feature-rich Discord bot with economy, games, cat café, giveaways, and more. Powered by Lotus.',
  keywords: ['discord bot', 'economy bot', 'mei bot', 'cat café', 'giveaway'],
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://meibot.app',
    siteName: 'Mei Bot',
    title: 'Mei Bot — Aesthetic Discord Community Bot',
    description: 'Economy, games, cat café, giveaways and more.',
    images: [{ url: '/og-image.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Mei Bot',
    description: 'Aesthetic Discord community bot',
    images: ['/og-image.png'],
  },
  icons: { icon: '/favicon.ico' },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-night-900 text-white antialiased">
        <AuthProvider>
          {children}
          <Toaster
            position="bottom-right"
            toastOptions={{
              style: {
                background: '#1a1a2e',
                color: '#f1f1f5',
                border: '1px solid rgba(255,34,119,0.2)',
                borderRadius: '12px',
                fontSize: '14px',
              },
              success: {
                iconTheme: { primary: '#ff2277', secondary: '#fff' },
              },
            }}
          />
        </AuthProvider>
      </body>
    </html>
  );
}
