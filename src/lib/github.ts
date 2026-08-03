const API = "https://api.github.com";

type GitHubFile = {
  path: string;
  content: string;
  sha: string | null;
};

type GitHubRef = {
  object?: { sha?: string };
};

type GitHubContent = {
  type?: string;
  content?: string;
  encoding?: string;
  sha?: string;
};

type GitHubMerge = {
  sha?: string;
  html_url?: string;
  commit?: {
    sha?: string;
    html_url?: string;
  };
};

export function githubEnabled(): boolean {
  return Boolean(process.env.GITHUB_TOKEN);
}

export function githubRepo() {
  const raw =
    process.env.GITHUB_REPOSITORY ||
    process.env.AI_GITHUB_REPOSITORY ||
    "dshak1/s2s";
  const [owner, repo] = raw.split("/");
  if (!owner || !repo) throw new Error("GITHUB_REPOSITORY must look like owner/repo.");
  return { owner, repo };
}

function authHeaders(): HeadersInit {
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error("Set GITHUB_TOKEN to let AI create branches.");
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

function refPath(branch: string): string {
  return `heads/${branch}`.split("/").map(encodeURIComponent).join("/");
}

async function githubFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const { owner, repo } = githubRepo();
  const res = await fetch(`${API}/repos/${owner}/${repo}${path}`, {
    ...init,
    headers: { ...authHeaders(), ...(init.headers ?? {}) },
    cache: "no-store",
  });
  if (!res.ok) {
    const detail = await res.text();
    if (res.status === 403) {
      throw new Error(
        [
          `GitHub 403 for ${owner}/${repo}.`,
          "The configured GITHUB_TOKEN can read the repo but cannot write branches or files.",
          "Use a GitHub token with repository access and Contents: Read and write.",
          `GitHub response: ${detail.slice(0, 240)}`,
        ].join(" "),
      );
    }
    throw new Error(`GitHub ${res.status}: ${detail.slice(0, 240)}`);
  }
  return (await res.json()) as T;
}

export async function getBranchSha(branch: string): Promise<string> {
  const ref = await githubFetch<GitHubRef>(`/git/ref/${refPath(branch)}`);
  if (!ref.object?.sha) throw new Error(`Could not resolve ${branch}.`);
  return ref.object.sha;
}

export async function createBranch(input: {
  branch: string;
  fromBranch: string;
}): Promise<string> {
  const sha = await getBranchSha(input.fromBranch);
  await githubFetch("/git/refs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ref: `refs/heads/${input.branch}`, sha }),
  });
  return sha;
}

export async function readGitHubFile(path: string, branch: string): Promise<GitHubFile | null> {
  try {
    const data = await githubFetch<GitHubContent>(
      `/contents/${path.split("/").map(encodeURIComponent).join("/")}?ref=${encodeURIComponent(branch)}`,
    );
    if (data.type !== "file" || !data.content) return null;
    const content = Buffer.from(data.content, data.encoding === "base64" ? "base64" : "utf8").toString("utf8");
    return { path, content, sha: data.sha ?? null };
  } catch (err) {
    if (err instanceof Error && err.message.startsWith("GitHub 404")) return null;
    throw err;
  }
}

export async function writeGitHubFile(input: {
  branch: string;
  path: string;
  content: string;
  message: string;
}): Promise<string | null> {
  const existing = await readGitHubFile(input.path, input.branch);
  const data = await githubFetch<{ commit?: { sha?: string } }>(
    `/contents/${input.path.split("/").map(encodeURIComponent).join("/")}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: input.message,
        branch: input.branch,
        content: Buffer.from(input.content, "utf8").toString("base64"),
        ...(existing?.sha ? { sha: existing.sha } : {}),
      }),
    },
  );
  return data.commit?.sha ?? null;
}

export async function writeGitHubBinaryFile(input: {
  branch: string;
  path: string;
  content: Buffer;
  message: string;
}): Promise<string | null> {
  const existing = await readGitHubFile(input.path, input.branch);
  const data = await githubFetch<{ commit?: { sha?: string } }>(
    `/contents/${input.path.split("/").map(encodeURIComponent).join("/")}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: input.message,
        branch: input.branch,
        content: input.content.toString("base64"),
        ...(existing?.sha ? { sha: existing.sha } : {}),
      }),
    },
  );
  return data.commit?.sha ?? null;
}

export async function mergeBranch(input: {
  base: string;
  head: string;
  message: string;
}): Promise<{ merged: boolean; sha: string; url: string | null }> {
  const { owner, repo } = githubRepo();
  const res = await fetch(`${API}/repos/${owner}/${repo}/merges`, {
    method: "POST",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({
      base: input.base,
      head: input.head,
      commit_message: input.message,
    }),
    cache: "no-store",
  });

  if (res.status === 204) {
    return { merged: false, sha: await getBranchSha(input.base), url: null };
  }
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`GitHub merge ${res.status}: ${detail.slice(0, 240)}`);
  }

  const data = (await res.json()) as GitHubMerge;
  const sha = data.sha ?? data.commit?.sha;
  if (!sha) throw new Error("GitHub merge did not return a commit SHA.");
  return {
    merged: true,
    sha,
    url: data.html_url ?? data.commit?.html_url ?? githubCommitUrl(sha),
  };
}

export function githubBranchUrl(branch: string): string {
  const { owner, repo } = githubRepo();
  return `https://github.com/${owner}/${repo}/tree/${encodeURIComponent(branch).replace(/%2F/g, "/")}`;
}

export function githubCommitUrl(sha: string): string {
  const { owner, repo } = githubRepo();
  return `https://github.com/${owner}/${repo}/commit/${encodeURIComponent(sha)}`;
}

export function validAiChangePath(path: string): boolean {
  if (!path || path.startsWith("/") || path.includes("..")) return false;
  if (path.startsWith(".") || path.startsWith("supabase/")) return false;
  if (path.includes(".env") || path.includes(".vercel") || path.endsWith("pnpm-lock.yaml")) {
    return false;
  }
  return (
    path.startsWith("src/") ||
    path.startsWith("docs/") ||
    path.startsWith("public/") ||
    path === "README.md"
  );
}
