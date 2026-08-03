type Deployment = {
  uid?: string;
  url?: string;
  state?: string;
  meta?: Record<string, string | undefined>;
};

type DeploymentList = {
  deployments?: Deployment[];
};

const API = "https://api.vercel.com";

type DeploymentTarget = "production" | "preview";

type DeploymentHit = {
  url: string;
  deploymentUrl: string;
  uid: string | null;
};

export function vercelEnabled(): boolean {
  return Boolean(process.env.VERCEL_TOKEN);
}

function deploymentQuery(input: {
  branch: string;
  commitSha?: string | null;
  target?: DeploymentTarget;
}): string {
  const params = new URLSearchParams({
    limit: "20",
    state: "READY",
    branch: input.branch,
  });
  if (input.commitSha) params.set("sha", input.commitSha);
  if (input.target) params.set("target", input.target);
  if (process.env.VERCEL_PROJECT_ID) {
    params.set("projectId", process.env.VERCEL_PROJECT_ID);
  } else {
    params.set("app", process.env.VERCEL_PROJECT_NAME || "s2s");
  }
  if (process.env.VERCEL_TEAM_ID) params.set("teamId", process.env.VERCEL_TEAM_ID);
  return params.toString();
}

async function vercelFetch<T>(path: string): Promise<T> {
  const token = process.env.VERCEL_TOKEN;
  if (!token) throw new Error("Set VERCEL_TOKEN to discover preview deployments.");
  const res = await fetch(`${API}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Vercel ${res.status}: ${detail.slice(0, 240)}`);
  }
  return (await res.json()) as T;
}

function absoluteDeploymentUrl(url: string): string {
  return url.startsWith("http") ? url : `https://${url}`;
}

function configuredProductionUrl(): string | null {
  const raw =
    process.env.AI_PRODUCTION_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (!raw) return null;
  return raw.startsWith("http") ? raw : `https://${raw}`;
}

async function findDeployment(input: {
  branch: string;
  commitSha?: string | null;
  target?: DeploymentTarget;
  canonicalUrl?: string | null;
}): Promise<DeploymentHit | null> {
  const data = await vercelFetch<DeploymentList>(`/v7/deployments?${deploymentQuery(input)}`);
  const deployments = data.deployments ?? [];
  const hit = deployments.find((deployment) => {
    const meta = deployment.meta ?? {};
    const shaMatches = input.commitSha ? meta.githubCommitSha === input.commitSha : false;
    return (
      deployment.state === "READY" &&
      (meta.githubCommitRef === input.branch ||
        shaMatches ||
        meta.githubCommitMessage?.includes(input.branch))
    );
  });
  if (!hit?.url) return null;
  const deploymentUrl = absoluteDeploymentUrl(hit.url);
  return {
    url: input.canonicalUrl ?? deploymentUrl,
    deploymentUrl,
    uid: hit.uid ?? null,
  };
}

export async function findPreviewDeployment(input: {
  branch: string;
  commitSha?: string | null;
}): Promise<string | null> {
  const queries = input.commitSha ? [input, { ...input, commitSha: null }] : [input];
  for (const query of queries) {
    const hit = await findDeployment({ ...query, target: "preview" });
    if (hit?.url) return hit.url;
  }
  return null;
}

export async function waitForPreview(input: {
  branch: string;
  commitSha?: string | null;
  attempts?: number;
  delayMs?: number;
}): Promise<string | null> {
  const attempts = input.attempts ?? 24;
  const delayMs = input.delayMs ?? 5000;
  for (let i = 0; i < attempts; i += 1) {
    const url = await findPreviewDeployment(input);
    if (url) return url;
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
  return null;
}

export async function findProductionDeployment(input: {
  branch: string;
  commitSha?: string | null;
}): Promise<DeploymentHit | null> {
  const queries = input.commitSha ? [input, { ...input, commitSha: null }] : [input];
  for (const query of queries) {
    const hit = await findDeployment({
      ...query,
      target: "production",
      canonicalUrl: configuredProductionUrl(),
    });
    if (hit) return hit;
  }
  return null;
}

export async function waitForProduction(input: {
  branch: string;
  commitSha?: string | null;
  attempts?: number;
  delayMs?: number;
}): Promise<DeploymentHit | null> {
  const attempts = input.attempts ?? 36;
  const delayMs = input.delayMs ?? 5000;
  for (let i = 0; i < attempts; i += 1) {
    const hit = await findProductionDeployment(input);
    if (hit) return hit;
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
  return null;
}
