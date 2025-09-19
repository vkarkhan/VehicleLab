import { withContentlayer } from "next-contentlayer";

const nextConfig = {
  reactStrictMode: true,
  experimental: {
    typedRoutes: true
  }
};

export default withContentlayer(nextConfig);
