export function classifyReply(text) {
  const value = String(text || "").trim();
  if (/^yes[.!]?\s*$/i.test(value)) return "yes";
  if (/^undo[.!]?\s*$/i.test(value)) return "undo";
  return "revise";
}

export function nextAction(state, text) {
  const kind = classifyReply(text);
  if (kind === "undo") return state && state.lastPublishSha ? "undo" : "nothing_to_undo";
  if (kind === "yes") return state && state.status === "awaiting_approval" ? "publish" : "no_preview";
  if (state && state.status === "awaiting_approval") return "revise";
  return "start";
}

export function emptyState() {
  return { status: "idle", branch: "", previewUrl: "", summary: "", lastPublishSha: "" };
}
