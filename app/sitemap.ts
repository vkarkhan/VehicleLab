import type { MetadataRoute } from "next";

import { getBlogPosts, getGuides } from "@/lib/contentlayer";
import { siteConfig } from "@/lib/seo";

export default function sitemap(): MetadataRoute.Sitemap {
  const guides = getGuides().map((guide) => ({
    url: `${siteConfig.url}/guides/${guide.slug}`,
    lastModified: guide.updatedAt ?? guide.publishedAt
  }));

  const posts = getBlogPosts().map((post) => ({
    url: `${siteConfig.url}/blog/${post.slug}`,
    lastModified: post.updatedAt ?? post.publishedAt
  }));

  const routes = ["", "/vehicellab", "/guides", "/blog", "/pricing", "/account", "/privacy", "/terms"].map(
    (path) => ({
      url: `${siteConfig.url}${path}`,
      lastModified: new Date().toISOString()
    })
  );

  return [...routes, ...guides, ...posts];
}
