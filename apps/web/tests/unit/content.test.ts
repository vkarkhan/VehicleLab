import fs from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";

describe("reference test docs content", () => {
  test("test docs have numeric order frontmatter without CR artifacts", () => {
    const docsDir = path.join(process.cwd(), "content", "tests");
    const files = fs.readdirSync(docsDir).filter((file) => file.endsWith(".mdx"));

    expect(files.length).toBeGreaterThanOrEqual(5);

    for (const file of files) {
      const text = fs.readFileSync(path.join(docsDir, file), "utf8");
      expect(text).not.toContain("\r");
      expect(text).toMatch(/^order:\s+\d+$/m);
    }
  });
});
