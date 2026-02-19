import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'places.googleapis.com' },
      { protocol: 'https', hostname: 'maps.googleapis.com' },
    ],
  },
};

export default nextConfig;
