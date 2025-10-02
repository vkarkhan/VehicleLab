import { defineDocumentType, makeSource } from "contentlayer/source-files";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeKatex from "rehype-katex";
import rehypeSlug from "rehype-slug";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";

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
    slug: { type: "string" },
    published: { type: "boolean", default: true },
    tags: { type: "list", of: { type: "string" } }
  },
  computedFields: {
    slug: {
      type: "string",
      resolve: (doc) => doc.slug ?? doc._raw.sourceFileName.replace(/\.mdx$/, "")
    },
    slugAsParams: {
      type: "string",
      resolve: (doc) => doc.slug ?? doc._raw.flattenedPath.replace(/^guides\//, "")
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

export const ModelDoc = defineDocumentType(() => ({
  name: "ModelDoc",
  filePathPattern: "models/*.mdx",
  contentType: "mdx",
  fields: {
    title: { type: "string", required: true },
    description: { type: "string", required: true },
    modelId: { type: "string", required: true },
    scenarioId: { type: "string", default: "step-steer" },
    order: { type: "number" }
  },
  computedFields: {
    slug: {
      type: "string",
      resolve: (doc) => doc._raw.sourceFileName.replace(/\.mdx$/, "")
    },
    slugAsParams: {
      type: "string",
      resolve: (doc) => doc._raw.flattenedPath.replace(/^models\//, "")
    }
  }
}));

export const TestDoc = defineDocumentType(() => ({
  name: "TestDoc",
  filePathPattern: "tests/*.mdx",
  contentType: "mdx",
  fields: {
    title: { type: "string", required: true },
    description: { type: "string", required: true },
    order: { type: "number" },
  },
  computedFields: {
    slug: {
      type: "string",
      resolve: (doc) => doc._raw.sourceFileName.replace(/\.mdx$/, ""),
    },
    slugAsParams: {
      type: "string",
      resolve: (doc) => doc._raw.flattenedPath.replace(/^tests\//, ""),
    },
  },
}));

export const Profile = defineDocumentType(() => ({
  name: "Profile",
  filePathPattern: `profile.json`,
  contentType: "data",
  fields: {
    name: { type: "string", required: true },
    tagline: { type: "string", required: true },
    showLogos: { type: "boolean" },
    enable3D: { type: "boolean" },
    enableAnalytics: { type: "boolean" }
  }
}));

export default makeSource({
  contentDirPath: "content",
  documentTypes: [Guide, BlogPost, ModelDoc, TestDoc, Profile],
  mdx: {
    remarkPlugins: [[remarkMath, {}], remarkGfm],
    rehypePlugins: [rehypeSlug, rehypeKatex, [rehypeAutolinkHeadings, { behavior: "wrap" }]]
  }
});

