/** @type {import('next').NextConfig} */
// On Cloudflare Pages each project is served from its own root domain, so no
// basePath. On GitHub Pages it is served from /steelman, so keep the subpath.
// Cloudflare sets CF_PAGES=1 automatically during its build.
const onCloudflare = process.env.CF_PAGES === '1';

const nextConfig = {
  output: 'export',
  images: { unoptimized: true },
  basePath: onCloudflare ? '' : '/steelman',
  trailingSlash: true,
};

module.exports = nextConfig;
