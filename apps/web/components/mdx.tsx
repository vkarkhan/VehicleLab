import { useMDXComponent } from "next-contentlayer/hooks";
import Image from "next/image";
import Link from "next/link";
import type { MDXComponents } from "mdx/types";

import { AdSlot } from "@/components/AdSlot";
import { Admonition } from "@/components/Admonition";
import { cn } from "@/lib/utils";

const components: MDXComponents = {
  h1: ({ className, ...props }) => (
    <h1 className={cn("mt-12 scroll-m-20 text-4xl font-bold tracking-tight", className)} {...props} />
  ),
  h2: ({ className, ...props }) => (
    <h2 className={cn("mt-10 scroll-m-20 text-3xl font-semibold tracking-tight", className)} {...props} />
  ),
  h3: ({ className, ...props }) => (
    <h3 className={cn("mt-8 scroll-m-20 text-2xl font-semibold tracking-tight", className)} {...props} />
  ),
  p: ({ className, ...props }) => (
    <p className={cn("leading-7 text-slate-700 dark:text-slate-300", className)} {...props} />
  ),
  ul: ({ className, ...props }) => (
    <ul className={cn("my-6 ml-6 list-disc space-y-2 text-slate-700 dark:text-slate-300", className)} {...props} />
  ),
  ol: ({ className, ...props }) => (
    <ol className={cn("my-6 ml-6 list-decimal space-y-2 text-slate-700 dark:text-slate-300", className)} {...props} />
  ),
  a: ({ className, href, ...props }) => {
    if (!href) {
      return <a className={cn("font-semibold text-brand-600 hover:text-brand-500", className)} {...props} />;
    }

    return (
      <Link
        className={cn("font-semibold text-brand-600 hover:text-brand-500", className)}
        href={href}
        {...props}
      />
    );
  },
  img: ({ src, alt, width, height, ...props }) => {
    const resolvedAlt = alt ?? "";
    const resolvedWidth = width ? Number(width) : 1200;
    const resolvedHeight = height ? Number(height) : 800;

    if (!src) {
      return (
        <img
          {...props}
          alt={resolvedAlt}
          width={resolvedWidth}
          height={resolvedHeight}
          className="rounded-3xl border border-slate-200 object-cover shadow-sm dark:border-slate-800"
        />
      );
    }

    return (
      <Image
        {...props}
        src={src}
        alt={resolvedAlt}
        width={resolvedWidth}
        height={resolvedHeight}
        className="rounded-3xl border border-slate-200 object-cover shadow-sm dark:border-slate-800"
      />
    );
  },
  Admonition,
  AdSlot
};

interface MdxProps {
  code: string;
}

export function Mdx({ code }: MdxProps) {
  const Component = useMDXComponent(code);
  return (
    <article className="prose prose-slate max-w-none dark:prose-invert">
      <Component components={components} />
    </article>
  );
}
