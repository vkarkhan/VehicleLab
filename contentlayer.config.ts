import { defineDocumentType, makeSource } from "contentlayer/source-files";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeSlug from "rehype-slug";
import remarkGfm from "remark-gfm";

const sharedFields = {
  title: { type: "string", required: true },
  description: { type: "string", required: true },
  publishedAt: { type: "date", required: true },
  updatedAt: { type: "date" },
  hero: { type: "string" },
  ctaPreset: { type: "string" }
} as const;

export const Guide = defineDocumentType(() => ({
  name: "Guide",
  filePathPattern: `guides/*.mdx`,
  contentType: "mdx",
  fields: {
    ...sharedFields,
    tags: { type: "list", of: { type: "string" } }
  },
  computedFields: {
    slug: {
      type: "string",
      resolve: (doc) => doc._raw.sourceFileName.replace(/\.mdx$/, "")
    },
    slugAsParams: {
      type: "string",
      resolve: (doc) => doc._raw.flattenedPath.replace(/^guides\//, "")
    }
  }
}));

export const BlogPost = defineDocumentType(() => ({
  name: "BlogPost",
  filePathPattern: `blog/*.mdx`,
  contentType: "mdx",
  fields: {
    ...sharedFields,
    tags: { type: "list", of: { type: "string" } }
  },
  computedFields: {
    slug: {
      type: "string",
      resolve: (doc) => doc._raw.sourceFileName.replace(/\.mdx$/, "")
    },
    slugAsParams: {
      type: "string",
      resolve: (doc) => doc._raw.flattenedPath.replace(/^blog\//, "")
    }
  }
}));

export default makeSource({
  contentDirPath: "content",
  documentTypes: [Guide, BlogPost],
  mdx: {
    remarkPlugins: [remarkGfm],
    rehypePlugins: [rehypeSlug, [rehypeAutolinkHeadings, { behavior: "wrap" }]]
  }
});
