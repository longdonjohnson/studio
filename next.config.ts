
import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  output: 'export', // Required for Capacitor to package static web assets
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    unoptimized: true, // Required for next/image to work with static export
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
    ],
  },
  env: {
    NEXT_PUBLIC_GEMINI_API_KEY: 'AIzaSyA8v21MNPT7OG9Ob-h_3dBPmZaBtnqlZh0',
  }
};

export default nextConfig;
