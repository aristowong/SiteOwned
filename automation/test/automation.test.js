import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { listClients } from "../src/registry.js";
import { emailAuthPassed, stripeSignature, stripeSignatureValid, twilioSignature, twilioSignatureValid } from "../src/verify.js";
import { parseGoogleVoiceAddress, stripGoogleVoiceFooter } from "../src/gv.js";
import { looksLikePhi } from "../src/phi.js";
import { handleInbound } from "../src/inbound.js";
import { applyPayment } from "../src/payments.js";
import { emptyLearnDb } from "../src/learn-core.js";

const here = dirname(fileURLToPath(import.meta.url));
const payload = (name) => JSON.parse(readFileSync(join(here, "../payloads", name), "utf8"));
const clients = listClients(JSON.parse(readFileSync(join(here, "../clients.json"), "utf8")));
const products = JSON.parse(readFileSync(join(here, "../../payments-config.json"), "utf8")).products;

function memoryKv() {
  const map = new Map();
  return {
    async get(key) { return map.has(key) ? map.get(key) : null; },
    async put(key, value) { map.set(key, value); },
  };
}

function activeClients() {
  return clients.map((client) => ({ ...client, active: true, emails: [...client.emails], phones: [...client.phones] }));
}

test("google voice parser reads sender and strips footer", () => {
  const sample = payload("gv-sms.json");
  const parsed = parseGoogleVoiceAddress(sample.from);
  assert.equal(parsed.senderNumber, "+13105550198");
  assert.equal(parsed.gvNumber, "+12065550199");
  assert.equal(stripGoogleVoiceFooter(sample.text), "Please change Friday hours to 9 to 1.");
});

test("twilio and stripe signatures round-trip", () => {
  const url = "https://example.com/webhooks/twilio";
  const params = { Body: "YES", From: "+13105550198" };
  const signature = twilioSignature({ url, params, authToken: "test-token" });
  assert.equal(twilioSignatureValid({ url, params, header: signature, authToken: "test-token" }), true);
  assert.equal(twilioSignatureValid({ url, params, header: "nope", authToken: "test-token" }), false);

  const raw = JSON.stringify(payload("stripe-checkout-course.json"));
  const timestamp = "1700000000";
  const v1 = stripeSignature({ secret: "whsec_test", timestamp, rawBody: raw });
  assert.equal(stripeSignatureValid({
    secret: "whsec_test",
    header: `t=${timestamp},v1=${v1}`,
    rawBody: raw,
    now: 1700000000 * 1000,
  }), true);
});

test("unknown sender and failed auth do not change the site", async () => {
  const unknown = payload("email-unknown.json");
  const kv = memoryKv();
  const result = await handleInbound({
    message: { channel: "email", fromEmail: unknown.from, text: unknown.text, headers: unknown.headers },
    clients: activeClients(),
    env: { REQUIRE_ACTIVE: "false" },
    deps: { kv },
  });
  assert.equal(result.changed, false);
  assert.match(result.replies[0].text, /nothing was changed/i);

  const failed = await handleInbound({
    message: { channel: "email", fromEmail: "owner@merrin-quill.example", text: "Change hours", headers: { "authentication-results": "spf=fail dkim=fail" } },
    clients: activeClients(),
    env: {},
    deps: { kv: memoryKv() },
  });
  assert.equal(failed.changed, false);
  assert.equal(emailAuthPassed({ "authentication-results": "spf=pass dkim=pass" }), true);
});

test("email preview, YES, and UNDO", async () => {
  const kv = memoryKv();
  const env = { REQUIRE_ACTIVE: "false", SITE_BASE_URL: "https://aristowong.github.io/SiteOwned" };
  const known = payload("email-known.json");
  const preview = await handleInbound({
    message: { channel: "email", fromEmail: known.from, text: known.text, headers: known.headers },
    clients: activeClients(),
    env,
    deps: { kv },
  });
  assert.equal(preview.action, "start");
  assert.match(preview.replies.at(-1).text, /Reply YES to publish/);
  assert.match(preview.state.previewUrl, /preview=/);

  const published = await handleInbound({
    message: { channel: "email", fromEmail: known.from, text: "YES", headers: known.headers },
    clients: activeClients(),
    env,
    deps: { kv },
  });
  assert.equal(published.action, "publish");
  assert.equal(published.replies.at(-1).text, "Your site is updated.");

  const undone = await handleInbound({
    message: { channel: "email", fromEmail: known.from, text: "UNDO", headers: known.headers },
    clients: activeClients(),
    env,
    deps: { kv },
  });
  assert.equal(undone.action, "undo");
});

test("clinic PHI is refused and not logged", async () => {
  assert.equal(looksLikePhi("Patient name: Ada, DOB: 1/2/2000"), true);
  const kv = memoryKv();
  const result = await handleInbound({
    message: {
      channel: "email",
      fromEmail: "owner@merrin-quill.example",
      text: "Patient name: Ada, DOB: 1/2/2000",
      headers: { "authentication-results": "spf=pass dkim=pass" },
    },
    clients: activeClients(),
    env: { REQUIRE_ACTIVE: "false" },
    deps: { kv },
  });
  assert.equal(result.changed, false);
  assert.equal(result.logs[0].kind, "phi_refused");
  assert.equal(JSON.stringify(result.logs).includes("Ada"), false);
});

test("google voice and twilio stay off unless flags are true", async () => {
  const sample = payload("gv-sms.json");
  const off = await handleInbound({
    message: { channel: "email", fromEmail: sample.from, text: sample.text, headers: { "authentication-results": "spf=pass dkim=pass" } },
    clients: activeClients(),
    env: { CHANNEL_GOOGLE_VOICE: "false" },
    deps: { kv: memoryKv() },
  });
  assert.match(off.replies[0].text, /not turned on/);

  const twilio = await handleInbound({
    message: { channel: "twilio", phone: "+13105550198", text: "YES" },
    clients: activeClients(),
    env: { CHANNEL_TWILIO: "false" },
    deps: { kv: memoryKv() },
  });
  assert.equal(twilio.error, "twilio_disabled");
});

test("test-mode course payment creates a student and rejects live events", () => {
  const db = emptyLearnDb();
  const event = payload("stripe-checkout-course.json");
  const ok = applyPayment({ event, mode: "test", products, clients: activeClients(), learnDb: db });
  assert.equal(ok.ok, true);
  assert.equal(ok.student.tier, "course");
  assert.equal(ok.student.testMode, true);
  assert.equal(ok.delivery.to, "student@example.com");
  const blocked = applyPayment({
    event: { ...event, livemode: true, data: { object: { ...event.data.object, livemode: true } } },
    mode: "test",
    products,
    clients: activeClients(),
    learnDb: emptyLearnDb(),
  });
  assert.equal(blocked.error, "mode_mismatch");
});
