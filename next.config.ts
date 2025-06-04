import type { NextConfig } from "next";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
let supabaseHostname = null;

if (supabaseUrl) {
  try {
    supabaseHostname = new URL(supabaseUrl).hostname;
  } catch (error) {
    console.warn(
      `[next.config.ts] Failed to parse NEXT_PUBLIC_SUPABASE_URL: ${supabaseUrl}. ` +
      `Please add your Supabase storage hostname to images.remotePatterns manually.`
    );
  }
}

// Define the type for the remote patterns array based on known structure
const remotePatternsForNextImage: Array<{
  protocol?: 'http' | 'https';
  hostname: string;
  port?: string;
  pathname?: string;
}> = [
  {
    protocol: 'https',
    hostname: 'lh3.googleusercontent.com',
  },
];

if (supabaseHostname) {
  remotePatternsForNextImage.push({
    protocol: 'https',
    hostname: supabaseHostname,
  });
} else if (!supabaseUrl) {
  console.warn(
    `[next.config.ts] NEXT_PUBLIC_SUPABASE_URL is not set. ` +
    `If you use Supabase storage for images, add its hostname to images.remotePatterns.`
  );
  // Removed hardcoded hostname for security - add your Supabase hostname to environment variables
}

const nextConfig: NextConfig = {
  images: {
    remotePatterns: remotePatternsForNextImage,
  },
  async headers() {
    return [
      {
        source: '/auth/callback',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, no-cache, must-revalidate, proxy-revalidate',
          },
          {
            key: 'Pragma',
            value: 'no-cache',
          },
          {
            key: 'Expires',
            value: '0',
          },
        ],
      },
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, no-cache, must-revalidate, proxy-revalidate',
          },
        ],
      },
    ]
  },
};

export default nextConfig;
