import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Lets phones on the same Wi-Fi open the dev server (http://<this Mac's IP>:3000) with all assets loading.
  allowedDevOrigins: ["192.168.1.12", "*.local"],
};

export default nextConfig;
