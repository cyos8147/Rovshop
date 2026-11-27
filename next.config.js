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
