#!/usr/bin/env node
/** Record git SHA and build time for /api/health deploy verification. */
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function resolveGitSha() {
  const fromEnv = process.env.SOURCE_VERSION?.trim();
  if (fromEnv) return fromEnv;

  try {
    return execSync("git rev-parse HEAD", { cwd: root, encoding: "utf8" }).trim();
  } catch {
    return "unknown";
  }
}

const info = {
  gitSha: resolveGitSha(),
  builtAt: new Date().toISOString(),
};

const outPath = path.join(root, "dist", "build-info.json");
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, `${JSON.stringify(info, null, 2)}\n`);
console.log(`[write-build-info] ${info.gitSha.slice(0, 7)} @ ${info.builtAt}`);
