/**
 * Minimal Databricks SQL Statement Execution API client.
 * Env: DATABRICKS_HOST, DATABRICKS_TOKEN, DATABRICKS_WAREHOUSE_ID
 *
 * Paginates result chunks so large Won YTD / stage-history pulls are not capped
 * at the ~1k n8n / ~10k MCP limits.
 */
const DEFAULT_POLL_MS = 1500;
const DEFAULT_TIMEOUT_MS = 10 * 60 * 1000;

function requireEnv(name) {
  const v = process.env[name]?.trim();
  if (!v) throw new Error(`Missing required env ${name}`);
  return v.replace(/\/$/, "");
}

function authHeaders() {
  return {
    Authorization: `Bearer ${requireEnv("DATABRICKS_TOKEN")}`,
    "Content-Type": "application/json",
  };
}

function host() {
  return requireEnv("DATABRICKS_HOST");
}

function warehouseId() {
  return requireEnv("DATABRICKS_WAREHOUSE_ID");
}

async function sleep(ms) {
  await new Promise((r) => setTimeout(r, ms));
}

/**
 * @param {string} statement
 * @param {{ rowLimit?: number, timeoutMs?: number }} [opts]
 * @returns {Promise<{ columns: string[], data: unknown[][] }>}
 */
export async function executeSql(statement, opts = {}) {
  const rowLimit = opts.rowLimit ?? 100_000;
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const started = Date.now();

  const createRes = await fetch(`${host()}/api/2.0/sql/statements`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({
      warehouse_id: warehouseId(),
      statement,
      wait_timeout: "50s",
      on_wait_timeout: "CONTINUE",
      disposition: "INLINE",
      format: "JSON_ARRAY",
      row_limit: rowLimit,
    }),
  });
  if (!createRes.ok) {
    const text = await createRes.text();
    throw new Error(`Databricks statement create failed (${createRes.status}): ${text.slice(0, 500)}`);
  }
  let payload = await createRes.json();
  let statementId = payload.statement_id;

  while (payload.status?.state === "PENDING" || payload.status?.state === "RUNNING") {
    if (Date.now() - started > timeoutMs) {
      throw new Error(`Databricks statement ${statementId} timed out after ${timeoutMs}ms`);
    }
    await sleep(DEFAULT_POLL_MS);
    const pollRes = await fetch(`${host()}/api/2.0/sql/statements/${statementId}`, {
      headers: authHeaders(),
    });
    if (!pollRes.ok) {
      const text = await pollRes.text();
      throw new Error(`Databricks statement poll failed (${pollRes.status}): ${text.slice(0, 500)}`);
    }
    payload = await pollRes.json();
  }

  const state = payload.status?.state;
  if (state !== "SUCCEEDED") {
    const err = payload.status?.error;
    throw new Error(
      `Databricks statement ${statementId} ended ${state}: ${err?.message ?? JSON.stringify(err ?? {})}`,
    );
  }

  const columns = (payload.manifest?.schema?.columns ?? []).map((c) => c.name);
  const chunks = [];
  const first = payload.result?.data_array ?? [];
  chunks.push(...first);

  let nextChunk = payload.result?.next_chunk_internal_link ?? payload.result?.next_chunk_index;
  let chunkIndex = typeof payload.result?.next_chunk_index === "number" ? payload.result.next_chunk_index : null;

  while (nextChunk != null || chunkIndex != null) {
    if (Date.now() - started > timeoutMs) {
      throw new Error(`Databricks chunk fetch timed out for ${statementId}`);
    }
    const url =
      typeof nextChunk === "string" && nextChunk.startsWith("http")
        ? nextChunk
        : typeof nextChunk === "string" && nextChunk.startsWith("/")
          ? `${host()}${nextChunk}`
          : `${host()}/api/2.0/sql/statements/${statementId}/result/chunks/${chunkIndex}`;
    const chunkRes = await fetch(url, { headers: authHeaders() });
    if (!chunkRes.ok) {
      const text = await chunkRes.text();
      throw new Error(`Databricks chunk fetch failed (${chunkRes.status}): ${text.slice(0, 500)}`);
    }
    const chunkPayload = await chunkRes.json();
    const rows = chunkPayload.data_array ?? chunkPayload.result?.data_array ?? [];
    chunks.push(...rows);
    nextChunk =
      chunkPayload.next_chunk_internal_link ??
      chunkPayload.result?.next_chunk_internal_link ??
      null;
    chunkIndex =
      typeof chunkPayload.next_chunk_index === "number"
        ? chunkPayload.next_chunk_index
        : typeof chunkPayload.result?.next_chunk_index === "number"
          ? chunkPayload.result.next_chunk_index
          : null;
    if (!nextChunk && chunkIndex == null) break;
  }

  return { columns, data: chunks };
}

/** Convenience: return array of row objects keyed by column name. */
export async function executeSqlObjects(statement, opts = {}) {
  const { columns, data } = await executeSql(statement, opts);
  return data.map((row) => {
    const obj = {};
    for (let i = 0; i < columns.length; i++) obj[columns[i]] = row[i];
    return obj;
  });
}
