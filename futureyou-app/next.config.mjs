/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    // Three.js needs these polyfills disabled for Next.js
    config.externals = config.externals || [];
    return config;
  },
  // Allow images from any origin (for photo upload previews)
  images: {
    remotePatterns: [],
  },
};

export default nextConfig;
