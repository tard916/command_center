/** @type {import('next').NextConfig} */
const nextConfig = {
  // Fix for Next.js 15 + pnpm on Vercel: the build tracer tries to lstat
  // app/(dashboard)/page_client-reference-manifest.js which doesn't exist
  // for server-only pages inside a route group. Excluding it prevents the
  // ENOENT crash during "Collecting build traces".
  outputFileTracingExcludes: {
    "**": [
      ".next/server/app/(dashboard)/page_client-reference-manifest.js",
    ],
  },
};

export default nextConfig;
