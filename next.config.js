/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      // Default is 1 MB, which rejects most phone screenshots of payment
      // slips. 6 MB matches the request size Netlify Functions accept;
      // single images are capped at 4 MB (MAX_IMAGE_SIZE) to leave room.
      bodySizeLimit: "6mb",
    },
  },
};

module.exports = nextConfig;
