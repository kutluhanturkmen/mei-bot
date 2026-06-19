/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'cdn.discordapp.com' },
      { protocol: 'https', hostname: 'avatars.githubusercontent.com' },
    ],
  },
  // NOTE: API rewrites are handled at runtime via NEXT_PUBLIC_API_URL in src/lib/api.ts.
  // No build-time rewrite needed — direct fetch with credentials:include is used instead.
};

module.exports = nextConfig;
