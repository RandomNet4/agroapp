/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  // ESLint warnings tidak memblokir build — linting tetap berjalan via pre-commit
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
      {
        protocol: "http",
        hostname: "**",
      },
    ],
  },
};

module.exports = nextConfig;

// Trigger Dev Server Restart
