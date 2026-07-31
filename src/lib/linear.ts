// Linear sync, one way: an idea the team decided to build becomes a Linear
// issue, and Linear's state flows back onto the idea card.
//
// Gated on LINEAR_API_KEY exactly like getSupabaseBrowser() is gated on the
// Supabase vars — with no key every function no-ops and the board works
// unchanged. Server-only: the key must never reach the browser.

const API = "https://api.linear.app/graphql";

export function linearEnabled(): boolean {
  return Boolean(process.env.LINEAR_API_KEY);
}

type GraphQLResult<T> = { data?: T; errors?: Array<{ message: string }> };

async function gql<T>(query: string, variables: Record<string, unknown> = {}): Promise<T | null> {
  const key = process.env.LINEAR_API_KEY;
  if (!key) return null;

  const res = await fetch(API, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: key },
    body: JSON.stringify({ query, variables }),
    cache: "no-store",
  });

  if (!res.ok) throw new Error(`Linear API ${res.status}`);

  const json = (await res.json()) as GraphQLResult<T>;
  if (json.errors?.length) throw new Error(json.errors.map((e) => e.message).join("; "));
  return json.data ?? null;
}

/** The team to file into: LINEAR_TEAM_ID if set, otherwise the first team. */
async function resolveTeamId(): Promise<string | null> {
  if (process.env.LINEAR_TEAM_ID) return process.env.LINEAR_TEAM_ID;
  const data = await gql<{ teams: { nodes: Array<{ id: string }> } }>(
    `query { teams(first: 1) { nodes { id } } }`,
  );
  return data?.teams.nodes[0]?.id ?? null;
}

export type LinearIssue = { id: string; identifier: string; url: string };

export async function createLinearIssue(input: {
  title: string;
  description: string;
}): Promise<LinearIssue | null> {
  const teamId = await resolveTeamId();
  if (!teamId) return null;

  const data = await gql<{
    issueCreate: { success: boolean; issue: LinearIssue | null };
  }>(
    `mutation CreateIssue($input: IssueCreateInput!) {
       issueCreate(input: $input) {
         success
         issue { id identifier url }
       }
     }`,
    { input: { teamId, title: input.title, description: input.description } },
  );

  return data?.issueCreate.success ? data.issueCreate.issue : null;
}

/**
 * Linear state type -> idea status. `triage`/`backlog`/`unstarted` all mean
 * "accepted but not begun", which the board calls planned.
 */
export function statusForLinearState(stateType: string): string | null {
  switch (stateType) {
    case "triage":
    case "backlog":
    case "unstarted":
      return "planned";
    case "started":
      return "building";
    case "completed":
      return "shipped";
    case "canceled":
      return "wont-do";
    default:
      return null;
  }
}
