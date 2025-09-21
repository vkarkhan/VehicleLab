import { withContentlayer } from "next-contentlayer";

const nextConfig = {
  reactStrictMode: true,
  experimental: {
    typedRoutes: false
  }
};

export default withContentlayer(nextConfig);
