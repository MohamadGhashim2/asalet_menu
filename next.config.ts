import type { NextConfig } from "next";

const fallbackSupabaseHostname = "xeqmpmcmvwkxztxqpxww.supabase.co";
const supabaseHostname = (() => {
  try {
    return process.env.NEXT_PUBLIC_SUPABASE_URL
      ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
      : fallbackSupabaseHostname;
  } catch {
    return fallbackSupabaseHostname;
  }
})();

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: supabaseHostname,
        port: "",
        pathname: "/storage/v1/object/public/menu-images/**",
      },
    ],
  },
};

export default nextConfig;
