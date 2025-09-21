export function GET(): Response {
  const body = "User-agent: *\nAllow: /\nSitemap: https://vehicellab.dev/sitemap.xml";
  return new Response(body, {
    headers: {
      "Content-Type": "text/plain"
    }
  });
}
