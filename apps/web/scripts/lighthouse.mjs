#!/usr/bin/env node
import { execSync } from "node:child_process";

const url = process.env.LHCI_URL ?? "http://localhost:3000";

console.log(`Running Lighthouse CI against ${url}`);

try {
  execSync(`npx --yes @lhci/cli collect --url=${url}`, { stdio: "inherit" });
} catch (error) {
  console.error("Lighthouse CI run failed", error);
  process.exitCode = 1;
}
