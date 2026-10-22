import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  // Lets a phone on the same Wi-Fi open the dev server at http://<this PC's IP>:3000.
  allowedDevOrigins: ["192.168.1.3"],
};

export default nextConfig;
