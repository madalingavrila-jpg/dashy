/**
 * Minimal Databricks SQL Statement Execution API client.
 * Env: DATABRICKS_HOST, DATABRICKS_TOKEN, DATABRICKS_WAREHOUSE_ID
 */
const DEFAULT_WAIT = "50s";
const POLL_MS = 2000;
const MAX_POLLS = 180; // ~6 min

function requireEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env ${name}`);
  return v.replace(/\/$/, "");
}

function authHeaders() {
  return {
    Authorization: `Bearer ${requireEnv("DATABRICKS_TOKEN")}`,
    "Content-Type": "application/json",
  };
}

function hostBase() {
  const host = requireEnv("DATABRICKS_HOST");
  return host.startsWith("http") ? host : `https://${host}`;
}

async function fetchJson(url, init) {
  const res = await fetch(url, init);
  const text = await res.text();
  let body;
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`Databricks non-JSON ${res.status}: ${text.slice(0, 300)}`);
  }
  if (!res.ok) {
    throw new Error(
      `Databricks HTTP ${res.status}: ${body.message || body.error || text.slice(0, 300)}`,
    );
  }
  return body;
}

async function waitForStatement(statementId) {
  const base = hostBase();
  for (let i = 0; i < MAX_POLLS; i++) {
    const body = await fetchJson(`${base}/api/2.0/sql/statements/${statementId}`, {
      headers: authHeaders(),
    });
    const state = body.status?.state;
    if (state === "SUCCEEDED") return body;
    if (state === "FAILED" || state === "CANCELED" || state === "CLOSED") {
      const err = body.status?.error;
      throw new Error(
        `Databricks statement ${state}: ${err?.message || JSON.stringify(err || body.status)}`,
      );
    }
    await new Promise((r) => setTimeout(r, POLL_MS));
  }
  throw new Error(`Databricks statement ${statementId} timed out after polling`);
}

async function collectExternalRows(manifest) {
  const rows = [];
  for (const chunk of manifest?.chunks ?? []) {
    const link = chunk.external_links?.[0]?.external_link;
    if (!link) continue;
    const res = await fetch(link);
    if (!res.ok) throw new Error(`Failed external link download HTTP ${res.status}`);
    const text = await res.text();
    // NDJSON or JSON array of arrays
    const trimmed = text.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith("[")) {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed) && parsed.length && Array.isArray(parsed[0])) {
        rows.push(...parsed);
      } else if (Array.isArray(parsed)) {
        // maybe array of objects — shouldn't happen with JSON_ARRAY
        rows.push(...parsed);
      }
    } else {
      for (const line of trimmed.split("\n")) {
        if (!line.trim()) continue;
        rows.push(JSON.parse(line));
      }
    }
  }
  return rows;
}

/**
 * Execute SQL and return { columns: string[], data: any[][] }.
 * Uses INLINE for small results; falls back to EXTERNAL_LINKS automatically
 * when Databricks returns an external manifest.
 */
export async function executeSql(statement, { catalog = "main", schema } = {}) {
  const warehouseId = requireEnv("DATABRICKS_WAREHOUSE_ID");
  const base = hostBase();

  const payload = {
    warehouse_id: warehouseId,
    statement,
    wait_timeout: DEFAULT_WAIT,
    on_wait_timeout: "CONTINUE",
    disposition: "INLINE",
    format: "JSON_ARRAY",
    catalog,
  };
  if (schema) payload.schema = schema;

  let body = await fetchJson(`${base}/api/2.0/sql/statements`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });

  const state = body.status?.state;
  if (state && state !== "SUCCEEDED") {
    if (state === "PENDING" || state === "RUNNING") {
      body = await waitForStatement(body.statement_id);
    } else {
      const err = body.status?.error;
      throw new Error(
        `Databricks statement ${state}: ${err?.message || JSON.stringify(err || body.status)}`,
      );
    }
  }

  // INLINE result too large → retry with EXTERNAL_LINKS
  if (body.status?.state === "FAILED" && /INLINE|too large|result/i.test(body.status?.error?.message || "")) {
    payload.disposition = "EXTERNAL_LINKS";
    body = await fetchJson(`${base}/api/2.0/sql/statements`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(payload),
    });
    if (body.status?.state !== "SUCCEEDED") {
      body = await waitForStatement(body.statement_id);
    }
  }

  const columns = (body.manifest?.schema?.columns ?? []).map((c) => c.name);
  let data = body.result?.data_array ?? [];

  if ((!data || data.length === 0) && body.manifest?.chunks?.length) {
    data = await collectExternalRows(body.manifest);
  }

  // Paginate INLINE next_chunk_internal_link
  let next = body.result?.next_chunk_internal_link;
  while (next) {
    const url = next.startsWith("http") ? next : `${base}${next}`;
    const chunk = await fetchJson(url, { headers: authHeaders() });
    const more = chunk.data_array ?? [];
    data = data.concat(more);
    next = chunk.next_chunk_internal_link;
  }

  return { columns, data, statementId: body.statement_id };
}

/** Convenience: return array of objects keyed by column name. */
export async function executeSqlObjects(statement, opts) {
  const { columns, data } = await executeSql(statement, opts);
  return data.map((row) => {
    const obj = {};
    columns.forEach((c, i) => {
      obj[c] = row[i];
    });
    return obj;
  });
}

export function sqlStringList(ids) {
  return ids.map((id) => `'${String(id).replace(/'/g, "''")}'`).join(",");
}
