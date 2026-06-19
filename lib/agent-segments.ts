/**
 * Server/Next-side view of the roster classification logic. The single source of
 * truth lives in `agent-segments.mjs` (plain ESM consumed directly by the Node
 * build scripts); this file just re-exports it so TypeScript code shares the
 * exact same OwnerId sets, name matching, and MTD targets. Do not duplicate
 * roster data here — edit `agent-segments.mjs`.
 */
export * from "./agent-segments.mjs";
