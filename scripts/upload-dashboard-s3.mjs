#!/usr/bin/env node
/**
 * Upload precomputed dashboard API artifacts (+ source mirrors) to Boltable
 * File Storage (S3). Requires AWS credentials (IRSA on Boltable, or local keys).
 *
 * Usage:
 *   npm run upload-s3
 *   node scripts/upload-dashboard-s3.mjs
 *   node scripts/upload-dashboard-s3.mjs --publish https://dashy.boltable.eu
 *
 * --publish URL uses PUT /api/publish/dashboard (needs DASHY_PUBLISH_TOKEN in
 * env on BOTH sides: local for the request, Boltable for the route). Prefer
 * this from the laptop when you have no AWS CLI — after the token is set on
 * Boltable.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");

const SECTIONS = [
  "overview",
  "mtd",
  "weekly",
  "accounts",
  "accounts-performance",
  "churn-prevention",
  "mops",
  "agents",
  "my-pipeline",
  "inbound",
  "mtd-details",
];

const bucket = process.env.S3_BUCKET || "boltable-dashy";
const region = process.env.S3_REGION || "eu-central-1";

function parseArgs(argv) {
  const out = { publishUrl: null, dryRun: false };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--publish") {
      out.publishUrl = argv[i + 1];
      i += 1;
    } else if (argv[i] === "--dry-run") {
      out.dryRun = true;
    }
  }
  return out;
}

function readUpdatedAt() {
  const candidates = [
    path.join(rootDir, "out/api/dashboard.json"),
    path.join(rootDir, "data/dashboard.json"),
  ];
  for (const file of candidates) {
    if (!fs.existsSync(file)) continue;
    try {
      const parsed = JSON.parse(fs.readFileSync(file, "utf8"));
      if (typeof parsed.updatedAt === "string") return parsed.updatedAt;
    } catch {
      /* continue */
    }
  }
  return new Date().toISOString();
}

function collectLocalAssets() {
  const assets = {};
  const keys = ["dashboard", ...SECTIONS.map((s) => `dashboard/${s}`)];
  for (const key of keys) {
    const relative = key === "dashboard" ? "dashboard.json" : `${key}.json`;
    const localPath = path.join(rootDir, "out/api", relative);
    if (!fs.existsSync(localPath)) {
      throw new Error(`Missing precomputed file: ${localPath} — run npm run build first`);
    }
    const entry = {
      raw: fs.readFileSync(localPath).toString("base64"),
    };
    if (fs.existsSync(`${localPath}.gz`)) {
      entry.gzip = fs.readFileSync(`${localPath}.gz`).toString("base64");
    }
    if (fs.existsSync(`${localPath}.br`)) {
      entry.br = fs.readFileSync(`${localPath}.br`).toString("base64");
    }
    assets[key] = entry;
  }
  return assets;
}

async function publishViaApi(publishUrl, dryRun) {
  const token = process.env.DASHY_PUBLISH_TOKEN;
  if (!token) {
    throw new Error("DASHY_PUBLISH_TOKEN is required for --publish");
  }
  const updatedAt = readUpdatedAt();
  const assets = collectLocalAssets();
  if (dryRun) {
    console.log(`[upload-s3] dry-run publish → ${publishUrl} (${Object.keys(assets).length} assets, updatedAt=${updatedAt})`);
    return;
  }
  const url = `${publishUrl.replace(/\/$/, "")}/api/publish/dashboard`;
  const response = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ updatedAt, assets }),
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Publish failed (${response.status}): ${text.slice(0, 400)}`);
  }
  console.log(`[upload-s3] published via ${url}`);
  console.log(text);
}

async function uploadViaAws(dryRun) {
  const updatedAt = readUpdatedAt();
  const files = [];
  const keys = ["dashboard", ...SECTIONS.map((s) => `dashboard/${s}`)];
  const s3 = new S3Client({ region });

  async function put(key, body, contentType, contentEncoding) {
    files.push(key);
    if (dryRun) {
      console.log(`  would put s3://${bucket}/${key} (${body.length} bytes)`);
      return;
    }
    await s3.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
        ...(contentEncoding ? { ContentEncoding: contentEncoding } : {}),
      }),
    );
  }

  for (const key of keys) {
    const relative = key === "dashboard" ? "dashboard.json" : `${key}.json`;
    const localPath = path.join(rootDir, "out/api", relative);
    if (!fs.existsSync(localPath)) {
      throw new Error(`Missing precomputed file: ${localPath} — run npm run build first`);
    }
    await put(`api/${relative}`, fs.readFileSync(localPath), "application/json");
    if (fs.existsSync(`${localPath}.gz`)) {
      await put(`api/${relative}.gz`, fs.readFileSync(`${localPath}.gz`), "application/json", "gzip");
    }
    if (fs.existsSync(`${localPath}.br`)) {
      await put(`api/${relative}.br`, fs.readFileSync(`${localPath}.br`), "application/json", "br");
    }
  }

  for (const name of ["dashboard.json", "mtd-details.json"]) {
    const localPath = path.join(rootDir, "data", name);
    if (fs.existsSync(localPath)) {
      await put(`data/${name}`, fs.readFileSync(localPath), "application/json");
    }
  }

  const manifest = {
    updatedAt,
    uploadedAt: new Date().toISOString(),
    source: "build",
    files,
  };
  await put(
    "meta/dashboard-manifest.json",
    Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`, "utf8"),
    "application/json",
  );

  if (!dryRun) {
    // Sanity: re-read manifest
    const check = await s3.send(
      new GetObjectCommand({ Bucket: bucket, Key: "meta/dashboard-manifest.json" }),
    );
    const text = await check.Body.transformToString();
    console.log(`[upload-s3] uploaded ${files.length} objects → s3://${bucket}/`);
    console.log(`[upload-s3] manifest updatedAt=${JSON.parse(text).updatedAt}`);
  } else {
    console.log(`[upload-s3] dry-run complete (${files.length} objects, updatedAt=${updatedAt})`);
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.publishUrl) {
    await publishViaApi(args.publishUrl, args.dryRun);
    return;
  }
  await uploadViaAws(args.dryRun);
}

main().catch((error) => {
  console.error("[upload-s3]", error instanceof Error ? error.message : error);
  process.exit(1);
});
