/** @type {import('next').NextConfig} */

// Two build targets from one codebase:
//  • default → normal Vercel build (keeps the /api routes for sort + voice)
//  • BUILD_TARGET=capacitor → static export to ./out for the native iOS shell
//    (the app calls the Vercel-hosted /api over the network instead)
const isCapacitor = process.env.BUILD_TARGET === "capacitor";

const nextConfig = {
  reactStrictMode: true,
  ...(isCapacitor
    ? { output: "export", images: { unoptimized: true } }
    : {
        // The premium redesign (/pro) is the default landing now; the classic
        // tree stays reachable at its own routes (/plan, /review, …).
        async redirects() {
          return [{ source: "/", destination: "/pro", permanent: false }];
        },
      }),
};

export default nextConfig;
