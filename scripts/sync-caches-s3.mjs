#!/usr/bin/env node
/**
 * Upload / download Salesforce + Databricks refresh caches under scripts/.cache/
 * to Boltable File Storage (S3) for DR and off-laptop refresh.
 *
 * Usage:
 *   node scripts/sync-caches-s3.mjs upload
 *   node scripts/sync-caches-s3.mjs download
 *   node scripts/sync-caches-s3.mjs upload --dry-run
 *
 * Does NOT upload secrets. Skips files > 25MB. Prefer the canonical manifest
 * from gen-all-cache-queries.mjs when present; otherwise uploads *.json in
 * scripts/.cache/.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import {
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const cacheDir = path.join(rootDir, "scripts/.cache");
const MAX_BYTES = 25 * 1024 * 1024;

const bucket = process.env.S3_BUCKET || "boltable-dashy";
const region = process.env.S3_REGION || "eu-central-1";

function listManifestFiles() {
  const result = spawnSync(
    process.execPath,
    [path.join(rootDir, "scripts/gen-all-cache-queries.mjs"), "--json"],
    { encoding: "utf8", cwd: rootDir },
  );
  if (result.status !== 0) {
    console.warn("[sync-caches] manifest gen failed — falling back to directory listing");
    return null;
  }
  try {
    const parsed = JSON.parse(result.stdout);
    const files = [];
    const walk = (node) => {
      if (!node || typeof node !== "object") return;
      if (typeof node.file === "string") files.push(node.file);
      if (typeof node.target === "string") files.push(node.target);
      if (Array.isArray(node)) {
        for (const item of node) walk(item);
        return;
      }
      for (const value of Object.values(node)) walk(value);
    };
    walk(parsed);
    return [...new Set(files.map((f) => path.basename(f)).filter((f) => f.endsWith(".json")))];
  } catch {
    return null;
  }
}

function listLocalCacheFiles() {
  if (!fs.existsSync(cacheDir)) return [];
  const fromManifest = listManifestFiles();
  const names = fromManifest ?? fs.readdirSync(cacheDir).filter((f) => f.endsWith(".json"));
  return names
    .map((name) => ({ name, path: path.join(cacheDir, name) }))
    .filter((entry) => fs.existsSync(entry.path));
}

async function upload(dryRun) {
  const s3 = new S3Client({ region });
  const files = listLocalCacheFiles();
  let uploaded = 0;
  let skipped = 0;
  for (const file of files) {
    const stat = fs.statSync(file.path);
    if (stat.size > MAX_BYTES) {
      console.warn(`[sync-caches] skip ${file.name} (${stat.size} bytes > ${MAX_BYTES})`);
      skipped += 1;
      continue;
    }
    const key = `cache/${file.name}`;
    if (dryRun) {
      console.log(`  would put s3://${bucket}/${key}`);
      uploaded += 1;
      continue;
    }
    await s3.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: fs.readFileSync(file.path),
        ContentType: "application/json",
      }),
    );
    uploaded += 1;
  }
  console.log(`[sync-caches] upload done: ${uploaded} files, ${skipped} skipped`);
}

async function download(dryRun) {
  const s3 = new S3Client({ region });
  fs.mkdirSync(cacheDir, { recursive: true });
  let continuationToken;
  let downloaded = 0;
  do {
    const page = await s3.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: "cache/",
        ContinuationToken: continuationToken,
      }),
    );
    for (const obj of page.Contents ?? []) {
      if (!obj.Key || !obj.Key.endsWith(".json")) continue;
      const name = path.basename(obj.Key);
      const dest = path.join(cacheDir, name);
      if (dryRun) {
        console.log(`  would get s3://${bucket}/${obj.Key} → ${dest}`);
        downloaded += 1;
        continue;
      }
      const result = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: obj.Key }));
      const bytes = Buffer.from(await result.Body.transformToByteArray());
      fs.writeFileSync(dest, bytes);
      downloaded += 1;
    }
    continuationToken = page.IsTruncated ? page.NextContinuationToken : undefined;
  } while (continuationToken);
  console.log(`[sync-caches] download done: ${downloaded} files`);
}

async function main() {
  const mode = process.argv[2];
  const dryRun = process.argv.includes("--dry-run");
  if (mode !== "upload" && mode !== "download") {
    console.error("Usage: node scripts/sync-caches-s3.mjs upload|download [--dry-run]");
    process.exit(1);
  }
  if (mode === "upload") await upload(dryRun);
  else await download(dryRun);
}

main().catch((error) => {
  console.error("[sync-caches]", error instanceof Error ? error.message : error);
  process.exit(1);
});
