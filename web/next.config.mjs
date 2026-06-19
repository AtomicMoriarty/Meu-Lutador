/** @type {import('next').NextConfig} */
const nextConfig = {
  // The app is fully client-rendered (all data via fetch to the ml-api edge
  // function), so we export a static site — ideal for Cloudflare Pages.
  output: "export",
  images: { unoptimized: true },
};
export default nextConfig;
