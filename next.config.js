// On Render the public URL is provided as RENDER_EXTERNAL_URL. Use it as the
// NextAuth/site URL when NEXTAUTH_URL isn't set, so the first deploy works
// without knowing the URL in advance. Set NEXTAUTH_URL explicitly when using
// a custom domain.
if (!process.env.NEXTAUTH_URL && process.env.RENDER_EXTERNAL_URL) {
  process.env.NEXTAUTH_URL = process.env.RENDER_EXTERNAL_URL;
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      // Default is 1 MB, which rejects most phone screenshots of payment
      // slips. Single images are capped at 4 MB (MAX_IMAGE_SIZE); 6 MB
      // leaves room for form overhead and a couple of images per request.
      bodySizeLimit: "6mb",
    },
  },
};

module.exports = nextConfig;
