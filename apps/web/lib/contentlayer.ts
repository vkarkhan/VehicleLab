import { allBlogPosts, allGuides } from "contentlayer/generated";

export function getGuides() {
  return allGuides.sort((a, b) => (a.publishedAt > b.publishedAt ? -1 : 1));
}

export function getGuideBySlug(slug: string) {
  return getGuides().find((guide) => guide.slug === slug);
}

export function getBlogPosts() {
  return allBlogPosts.sort((a, b) => (a.publishedAt > b.publishedAt ? -1 : 1));
}

export function getBlogPostBySlug(slug: string) {
  return getBlogPosts().find((post) => post.slug === slug);
}
