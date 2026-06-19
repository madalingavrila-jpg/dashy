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

function loadAsset(filePath: string): ApiAsset | null {
  const raw = readIfExists(filePath);
  if (!raw) {
    return null;
  }
  const etag = `"${crypto.createHash("sha1").update(raw).digest("base64").slice(0, 27)}"`;
  return {
    raw,
    gzip: readIfExists(`${filePath}.gz`),
    br: readIfExists(`${filePath}.br`),
    etag,
    contentType: CONTENT_TYPE_JSON,
  };
}

const assets = new Map<string, ApiAsset>();

/** Preload precomputed JSON (+ gzip/br) into memory. Safe to call repeatedly. */
export function preloadApiAssets(): void {
  assets.clear();
  const full = loadAsset(getPrecomputedApiPath());
  if (full) {
    assets.set("dashboard", full);
  }
  for (const section of DASHBOARD_SECTIONS) {
    const asset = loadAsset(getPrecomputedSectionPath(section));
    if (asset) {
      assets.set(`dashboard/${section}`, asset);
    }
  }
}

export function getFullDashboardAsset(): ApiAsset | undefined {
  return assets.get("dashboard");
}

export function getSectionAsset(section: DashboardSection): ApiAsset | undefined {
  return assets.get(`dashboard/${section}`);
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
