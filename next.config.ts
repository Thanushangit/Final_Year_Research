import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The floating dev badge covers the presenter bar; build and runtime errors still appear.
  devIndicators: false,
  // Ship the optional sample recordings with the TTS route when the app is deployed.
  outputFileTracingIncludes: {
    "/api/tts": ["./public/mock-audio/**/*"],
  },
};

export default nextConfig;
