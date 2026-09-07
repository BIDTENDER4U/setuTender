/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  experimental: { serverComponentsExternalPackages: ["pdf-parse", "pdf-lib"] },
};
export default nextConfig;
