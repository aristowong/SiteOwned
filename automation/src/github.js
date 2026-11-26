export function branchName(clientId) {
  return `update/${String(clientId).replace(/[^a-z0-9-]/gi, "-")}`;
}

export function previewUrl(base, client) {
  const root = String(base || "").replace(/\/$/, "");
  const path = client.sitePath ? `${client.sitePath}/` : "";
  return `${root}/${path}?preview=${encodeURIComponent(branchName(client.id))}`;
}

export function dryRunGit(client, base) {
  return {
    dryRun: true,
    branch: branchName(client.id),
    sha: "dryrun",
    previewUrl: previewUrl(base, client),
  };
}

export async function publishBranch({ token, repo, branch, defaultBranch = "main", fetchImpl = fetch }) {
  if (!token) return { dryRun: true, merged: true, sha: "dryrun-merge" };
  const response = await fetchImpl(`https://api.github.com/repos/${repo}/merges`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      accept: "application/vnd.github+json",
      "content-type": "application/json",
      "user-agent": "siteowned-updates",
    },
    body: JSON.stringify({ base: defaultBranch, head: branch, commit_message: "Publish approved site update" }),
  });
  if (!response.ok) throw new Error(`GitHub merge HTTP ${response.status}`);
  const data = await response.json();
  return { dryRun: false, merged: true, sha: data.sha };
}
