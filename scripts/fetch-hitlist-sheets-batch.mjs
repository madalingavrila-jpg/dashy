#!/usr/bin/env node
import { writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const cache = join(root, "scripts/.cache");
mkdirSync(cache, { recursive: true });

const manifest = {
  spreadsheet_id: "1IW8IxEs-YCsYMlCeTfkIz-b51eStjR5uUIEpkV1akRE",
  complex: [],
  density: [],
};
for (let r = 4; r <= 553; r += 50) {
  const e = Math.min(r + 49, 553);
  manifest.complex.push(`Complex Weekly Tracker - All!A${r}:Y${e}`);
  manifest.density.push(`Density Weekly Tracker - All!A${r}:Q${e}`);
}
writeFileSync(join(cache, "hitlist-range-manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify({ complexChunks: manifest.complex.length, densityChunks: manifest.density.length }));
