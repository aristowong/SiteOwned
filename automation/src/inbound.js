import { findByEmail, findByPhone, monthKey } from "./registry.js";
import { emailAuthPassed } from "./verify.js";
import { isGoogleVoiceAddress, parseGoogleVoiceAddress, stripGoogleVoiceFooter, googleVoiceReply } from "./gv.js";
import { looksLikePhi } from "./phi.js";
import { classifyRequest, overCap } from "./guardrails.js";
import { nextAction, emptyState } from "./approval.js";
import { samplePatch } from "./agent.js";
import { dryRunGit, previewUrl } from "./github.js";

function flag(env, name) {
  return String(env?.[name] || "").toLowerCase() === "true";
}

async function kvGet(kv, key) {
  if (!kv) return null;
  const raw = await kv.get(key);
  return raw ? JSON.parse(raw) : null;
}

async function kvPut(kv, key, value) {
  if (!kv) return;
  await kv.put(key, JSON.stringify(value));
}

export function unknownReply() {
  return "Thanks for writing. This address is not on a SiteOwned plan, so nothing was changed. Use the email on your account, or write to hello@siteowned.ai.";
}

export async function handleInbound({ message, clients, env = {}, deps = {} }) {
  const replies = [];
  const logs = [];
  const reply = async (to, text, subject = "SiteOwned") => {
    replies.push({ to, subject, text });
    if (deps.reply) await deps.reply({ to, subject, text });
  };
  const log = (entry) => logs.push({ at: new Date().toISOString(), ...entry });

  let channel = message.channel || "email";
  let text = String(message.text || "");
  let fromEmail = message.fromEmail || "";
  let replyTo = message.replyTo || fromEmail;
  let phone = message.phone || "";

  if (isGoogleVoiceAddress(fromEmail) || channel === "gv") {
    if (!flag(env, "CHANNEL_GOOGLE_VOICE")) {
      await reply(replyTo, "Text updates are not turned on. Email the edit from the address on your account.");
      log({ kind: "channel_disabled", channel: "google_voice" });
      return { changed: false, replies, logs };
    }
    const parsed = parseGoogleVoiceAddress(fromEmail);
    if (!parsed) {
      await reply(replyTo, "We could not read that text. Email the edit instead.");
      return { changed: false, replies, logs };
    }
    phone = parsed.senderNumber;
    replyTo = parsed.replyTo;
    text = stripGoogleVoiceFooter(text);
    channel = "gv";
  }

  if (channel === "twilio" && !flag(env, "CHANNEL_TWILIO")) {
    log({ kind: "channel_disabled", channel: "twilio" });
    return { changed: false, replies, logs, error: "twilio_disabled" };
  }

  if (channel === "email") {
    if (!emailAuthPassed(message.headers || {})) {
      await reply(replyTo, "We could not verify that email, so nothing was changed. Send it again from your usual mail provider.");
      log({ kind: "email_auth_failed" });
      return { changed: false, replies, logs };
    }
  }

  const client = channel === "email" ? findByEmail(clients, fromEmail) : findByPhone(clients, phone);
  if (!client) {
    await reply(replyTo, unknownReply());
    log({ kind: "unknown_sender", channel });
    return { changed: false, replies, logs };
  }
  if (!client.active && env.REQUIRE_ACTIVE !== "false") {
    await reply(replyTo, "This plan is not active yet, so nothing was changed. Finish checkout, then email from this same address.");
    log({ kind: "inactive", clientId: client.id });
    return { changed: false, replies, logs };
  }

  if (client.clinic && looksLikePhi(text)) {
    await reply(replyTo, "Do not send patient details. Email only public website edits, such as hours or a bio.");
    log({ kind: "phi_refused", clientId: client.id });
    return { changed: false, replies, logs };
  }

  const stateKey = `pending:${client.id}`;
  const usageKey = `usage:${client.id}:${monthKey()}`;
  const state = (await kvGet(deps.kv, stateKey)) || emptyState();
  const usage = (await kvGet(deps.kv, usageKey)) || { count: 0 };
  const action = nextAction(state, text);
  const base = env.SITE_BASE_URL || "https://aristowong.github.io/SiteOwned";
  const sms = channel === "gv";

  if (action === "nothing_to_undo" || action === "no_preview") {
    await reply(replyTo, action === "no_preview" ? "There is no preview waiting. Email the change you want." : "There is no published edit to undo.");
    return { changed: false, replies, logs, action };
  }

  if (action === "publish") {
    const published = deps.merge ? await deps.merge(client, state) : { sha: "dryrun-merge" };
    state.status = "idle";
    state.lastPublishSha = published.sha;
    state.summary = "";
    usage.count += 1;
    await kvPut(deps.kv, stateKey, state);
    await kvPut(deps.kv, usageKey, usage);
    const line = "Your site is updated.";
    await reply(replyTo, sms ? googleVoiceReply(line, client.siteUrl) : line);
    log({ kind: "published", clientId: client.id });
    return { changed: true, replies, logs, action };
  }

  if (action === "undo") {
    const reverted = deps.revert ? await deps.revert(client, state) : { sha: "dryrun-revert" };
    state.lastPublishSha = reverted.sha;
    await kvPut(deps.kv, stateKey, state);
    await reply(replyTo, "The last published edit was reverted.");
    log({ kind: "undo", clientId: client.id });
    return { changed: true, replies, logs, action };
  }

  const risk = classifyRequest(text);
  if (risk.risky) {
    if (deps.reply) await deps.reply({ to: env.OWNER_EMAIL || "hello@siteowned.ai", subject: "SiteOwned review", text: `${client.id} needs a person: ${risk.reason}` });
    replies.push({ to: env.OWNER_EMAIL || "hello@siteowned.ai", subject: "SiteOwned review", text: risk.reason });
    await reply(replyTo, `A person needs to look at that request (${risk.reason}). Nothing was published.`);
    log({ kind: "escalated", clientId: client.id, reason: risk.reason });
    return { changed: false, replies, logs, action: "escalate" };
  }

  if (overCap(usage.count, client.monthlyPublishCap || env.MONTHLY_PUBLISH_CAP || 100)) {
    await reply(replyTo, "This month's publish cap has been reached. Write to hello@siteowned.ai if a person should review more edits.");
    log({ kind: "capped", clientId: client.id });
    return { changed: false, replies, logs };
  }

  const patch = deps.llm ? await deps.llm({ requestText: text, client }) : samplePatch();
  const git = deps.commit ? await deps.commit(client, patch) : dryRunGit(client, base);
  state.status = "awaiting_approval";
  state.branch = git.branch;
  state.previewUrl = git.previewUrl || previewUrl(base, client);
  state.summary = patch.summary;
  await kvPut(deps.kv, stateKey, state);
  const summary = `${patch.summary} Reply YES to publish or tell me what to change.`;
  const body = sms ? googleVoiceReply(summary, state.previewUrl) : `${summary}\n${state.previewUrl}`;
  await reply(replyTo, body);
  log({ kind: action === "revise" ? "revised" : "preview", clientId: client.id });
  return { changed: true, replies, logs, action, state };
}
