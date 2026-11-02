import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  // Lets a phone on the same Wi-Fi open the dev server at http://<this PC's IP>:3000.
  allowedDevOrigins: ["192.168.1.3"],
  async headers() {
    return [
      {
        // The worker must always be re-checked, or an old copy could stay for days.
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
    ];
  },
};

export default nextConfig;
