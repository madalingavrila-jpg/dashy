import crypto from "node:crypto";
import fs from "node:fs";
import type { Request, Response } from "express";
import {
  DASHBOARD_SECTIONS,
  getPrecomputedApiPath,
  getPrecomputedSectionPath,
  type DashboardSection,
} from "./dashboard.js";

/**
 * Immutable, in-memory representation of a precomputed API JSON file plus its
 * build-time gzip/brotli variants. Preloading these (a few hundred KB total)
 * means request handling never reads from disk or runs zlib — the per-request
 * gzip allocations were the main RSS driver under concurrency on Boltable.
 */
export type ApiAsset = {
  raw: Buffer;
  gzip: Buffer | null;
  br: Buffer | null;
  etag: string;
  contentType: string;
};

const CONTENT_TYPE_JSON = "application/json; charset=utf-8";

function readIfExists(filePath: string): Buffer | null {
  try {
    return fs.existsSync(filePath) ? fs.readFileSync(filePath) : null;
  } catch {
    return null;
  }
}

function etagForRaw(raw: Buffer): string {
  return `"${crypto.createHash("sha1").update(raw).digest("base64").slice(0, 27)}"`;
}

function loadAsset(filePath: string): ApiAsset | null {
  const raw = readIfExists(filePath);
  if (!raw) {
    return null;
  }
  return {
    raw,
    gzip: readIfExists(`${filePath}.gz`),
    br: readIfExists(`${filePath}.br`),
    etag: etagForRaw(raw),
    contentType: CONTENT_TYPE_JSON,
  };
}

/** Build an ApiAsset from in-memory buffers (S3 sync / publish). */
export function buildApiAsset(
  raw: Buffer,
  gzip: Buffer | null = null,
  br: Buffer | null = null,
): ApiAsset {
  return {
    raw,
    gzip,
    br,
    etag: etagForRaw(raw),
    contentType: CONTENT_TYPE_JSON,
  };
}

let assets = new Map<string, ApiAsset>();

/** Preload precomputed JSON (+ gzip/br) into memory. Safe to call repeatedly. */
export function preloadApiAssets(): void {
  const next = new Map<string, ApiAsset>();
  const full = loadAsset(getPrecomputedApiPath());
  if (full) {
    next.set("dashboard", full);
  }
  for (const section of DASHBOARD_SECTIONS) {
    const asset = loadAsset(getPrecomputedSectionPath(section));
    if (asset) {
      next.set(`dashboard/${section}`, asset);
    }
  }
  assets = next;
}

/** Atomically replace the in-memory asset map (S3 / publish hot-swap). */
export function replaceApiAssets(next: Map<string, ApiAsset>): void {
  assets = next;
}

export function getFullDashboardAsset(): ApiAsset | undefined {
  return assets.get("dashboard");
}

export function getSectionAsset(section: DashboardSection): ApiAsset | undefined {
  return assets.get(`dashboard/${section}`);
}

export function getApiAsset(key: string): ApiAsset | undefined {
  return assets.get(key);
}

/** Parse updatedAt from the preloaded full dashboard payload, if present. */
export function getLocalDashboardUpdatedAt(): string | null {
  const full = assets.get("dashboard");
  if (!full) return null;
  try {
    const parsed = JSON.parse(full.raw.toString("utf8")) as { updatedAt?: string };
    return typeof parsed.updatedAt === "string" ? parsed.updatedAt : null;
  } catch {
    return null;
  }
}

function acceptsEncoding(req: Request, encoding: string): boolean {
  const header = req.headers["accept-encoding"];
  if (!header) return false;
  const value = Array.isArray(header) ? header.join(",") : header;
  return new RegExp(`(^|[,\\s])${encoding}([,;\\s]|$)`, "i").test(value);
}

/**
 * Serve a preloaded asset with content negotiation, strong ETag, and 304
 * support. Content-Encoding is set explicitly so the compression middleware
 * skips this response (no double compression, no runtime zlib).
 */
export function sendApiAsset(
  req: Request,
  res: Response,
  asset: ApiAsset,
  cacheControl: string,
): void {
  res.setHeader("Cache-Control", cacheControl);
  res.setHeader("Content-Type", asset.contentType);
  res.setHeader("ETag", asset.etag);
  res.setHeader("Vary", "Accept-Encoding");

  const ifNoneMatch = req.headers["if-none-match"];
  if (ifNoneMatch && ifNoneMatch === asset.etag) {
    res.status(304).end();
    return;
  }

  if (req.method === "HEAD") {
    res.end();
    return;
  }

  if (asset.br && acceptsEncoding(req, "br")) {
    res.setHeader("Content-Encoding", "br");
    res.end(asset.br);
    return;
  }
  if (asset.gzip && acceptsEncoding(req, "gzip")) {
    res.setHeader("Content-Encoding", "gzip");
    res.end(asset.gzip);
    return;
  }
  res.end(asset.raw);
}
