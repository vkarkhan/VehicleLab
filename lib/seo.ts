export const siteConfig = {
  name: "VehicleLab",
  description: "Interactive WebGL sandbox for real-time vehicle dynamics.",
  url: "https://vehicellab.dev",
  ogImage: "https://vehicellab.dev/og.png",
  keywords: [
    "vehicle dynamics",
    "webgl",
    "simulation",
    "automotive engineering"
  ]
};

export function absoluteUrl(path = "") {
  try {
    return new URL(path, siteConfig.url).toString();
  } catch {
    return siteConfig.url;
  }
}
