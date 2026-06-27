import type { NextConfig } from "next";

function parseAllowedDevOrigins() {
  const fromEnv = (process.env.ALLOWED_DEV_ORIGINS ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  return [
    // Legacy LAN IPs used during local testing
    "192.168.0.3",
    "192.168.0.3:3000",
    "192.168.45.54",
    "192.168.45.54:3000",
    // Current dev machine LAN IP (mobile: http://192.168.45.123:3000)
    "192.168.45.123",
    "192.168.45.123:3000",
    // Allow any 192.168.x.x host on port 3000 when DHCP changes the address
    "192.168.*.*",
    "192.168.*.*:3000",
    ...fromEnv,
  ];
}

const nextConfig: NextConfig = {
  allowedDevOrigins: parseAllowedDevOrigins(),
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "picsum.photos",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "**.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default nextConfig;
