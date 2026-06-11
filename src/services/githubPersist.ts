import { config } from "../config.js";

export type GitHubCommitResult = {
  commitSha: string;
  commitUrl?: string;
};

type GitHubContentResponse = {
  sha?: string;
  message?: string;
};

type GitHubCommitResponse = {
  commit?: { sha?: string; html_url?: string };
  content?: { sha?: string };
};

function parseRepo(repo: string): { owner: string; name: string } {
  const trimmed = repo.trim();
  const slash = trimmed.indexOf("/");
  if (slash <= 0 || slash === trimmed.length - 1) {
    throw new Error(`Invalid GITHUB_REPO "${repo}" — expected owner/repo`);
  }
  return { owner: trimmed.slice(0, slash), name: trimmed.slice(slash + 1) };
}

function githubHeaders(token: string): Record<string, string> {
  return {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    "User-Agent": "dashy-target-config",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

export function isGitHubPersistEnabled(): boolean {
  return Boolean(config.githubToken && config.githubRepo);
}

export async function commitFileToGitHub(
  relativePath: string,
  content: string,
  message: string,
): Promise<GitHubCommitResult> {
  if (!config.githubToken || !config.githubRepo) {
    throw new Error("GitHub persistence is not configured");
  }

  const { owner, name } = parseRepo(config.githubRepo);
  const branch = config.githubBranch;
  const encodedPath = relativePath
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
  const contentsUrl = `https://api.github.com/repos/${owner}/${name}/contents/${encodedPath}?ref=${encodeURIComponent(branch)}`;

  let existingSha: string | undefined;
  const getResponse = await fetch(contentsUrl, {
    method: "GET",
    headers: githubHeaders(config.githubToken),
  });

  if (getResponse.ok) {
    const existing = (await getResponse.json()) as GitHubContentResponse;
    existingSha = existing.sha;
  } else if (getResponse.status !== 404) {
    const detail = await getResponse.text();
    throw new Error(`GitHub read failed (${getResponse.status}): ${detail.slice(0, 200)}`);
  }

  const putBody: Record<string, string> = {
    message,
    content: Buffer.from(content, "utf8").toString("base64"),
    branch,
  };
  if (existingSha) {
    putBody.sha = existingSha;
  }

  const putResponse = await fetch(
    `https://api.github.com/repos/${owner}/${name}/contents/${encodedPath}`,
    {
      method: "PUT",
      headers: githubHeaders(config.githubToken),
      body: JSON.stringify(putBody),
    },
  );

  if (!putResponse.ok) {
    const detail = await putResponse.text();
    throw new Error(`GitHub commit failed (${putResponse.status}): ${detail.slice(0, 300)}`);
  }

  const result = (await putResponse.json()) as GitHubCommitResponse;
  const commitSha = result.commit?.sha ?? result.content?.sha;
  if (!commitSha) {
    throw new Error("GitHub commit succeeded but no commit SHA returned");
  }

  return {
    commitSha,
    commitUrl: result.commit?.html_url,
  };
}
