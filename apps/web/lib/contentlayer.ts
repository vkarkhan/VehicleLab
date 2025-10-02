import { allBlogPosts, allGuides, allModelDocs, allTestDocs } from "contentlayer/generated";
import type { ModelDoc, TestDoc } from "contentlayer/generated";

export function getGuides() {
  return allGuides
    .filter((guide) => guide.published !== false)
    .sort((a, b) => (a.publishedAt > b.publishedAt ? -1 : 1));
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



export function getModelDocs(): ModelDoc[] {
  return allModelDocs
    .slice()
    .sort((a: ModelDoc, b: ModelDoc) => {
      const orderA = typeof a.order === "number" ? a.order : 100;
      const orderB = typeof b.order === "number" ? b.order : 100;
      if (orderA !== orderB) {
        return orderA - orderB;
      }
      return a.title.localeCompare(b.title);
    });
}

export function getModelDocBySlug(slug: string): ModelDoc | undefined {
  return getModelDocs().find((doc: ModelDoc) => doc.slug === slug);
}

export function getTestDocs(): TestDoc[] {
  return allTestDocs
    .slice()
    .sort((a, b) => {
      const orderA = typeof a.order === "number" ? a.order : 100;
      const orderB = typeof b.order === "number" ? b.order : 100;
      if (orderA !== orderB) {
        return orderA - orderB;
      }
      return a.title.localeCompare(b.title);
    });
}

export function getTestDocBySlug(slug: string): TestDoc | undefined {
  return getTestDocs().find((doc) => doc.slug === slug);
}
