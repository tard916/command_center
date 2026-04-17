/** @type {import('next').NextConfig} */
const nextConfig = {
  // Silence the "multiple lockfiles" warning by pinning the workspace root
  // to this project rather than the user's home directory.
  outputFileTracingRoot: process.cwd(),
};

export default nextConfig;
