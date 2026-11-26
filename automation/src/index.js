import clientsJson from "../clients.json" with { type: "json" };
import paymentsConfig from "../../payments-config.json" with { type: "json" };
import { listClients } from "./registry.js";
import { stripeSignatureValid, twilioSignatureValid } from "./verify.js";
import { handleInbound } from "./inbound.js";
import { applyPayment } from "./payments.js";
import { emptyLearnDb } from "./learn-core.js";

function loadClients() {
  return listClients(clientsJson);
}

function loadProducts() {
  return paymentsConfig.products;
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json" } });
}

function flag(env, name, fallback = false) {
  const value = env?.[name];
  if (value == null || value === "") return fallback;
  return String(value).toLowerCase() === "true";
}

export default {
  async email(message, env) {
    if (!flag(env, "CHANNEL_EMAIL", true)) {
      message.setReject?.("email disabled");
      return;
    }
    const headers = {};
    message.headers?.forEach?.((value, key) => { headers[key] = value; });
    const clients = loadClients();
    await handleInbound({
      message: { channel: "email", fromEmail: message.from, text: message.text || "", headers },
      clients,
      env,
    });
  },

  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/health") {
      return json({
        ok: true,
        stripeMode: env.STRIPE_MODE || "test",
        channels: {
          email: flag(env, "CHANNEL_EMAIL", true),
          googleVoice: flag(env, "CHANNEL_GOOGLE_VOICE", false),
          twilio: flag(env, "CHANNEL_TWILIO", false),
        },
      });
    }
    if (url.pathname === "/webhooks/twilio" && request.method === "POST") {
      if (!flag(env, "CHANNEL_TWILIO", false)) return new Response("SMS channel disabled", { status: 404 });
      const params = Object.fromEntries(new URLSearchParams(await request.text()));
      const valid = twilioSignatureValid({
        url: request.url,
        params,
        header: request.headers.get("x-twilio-signature"),
        authToken: env.TWILIO_AUTH_TOKEN,
      });
      if (!valid) return new Response("invalid signature", { status: 401 });
      const result = await handleInbound({
        message: { channel: "twilio", phone: params.From, text: params.Body },
        clients: loadClients(),
        env,
      });
      return json(result);
    }
    if (url.pathname === "/webhooks/email" && request.method === "POST") {
      const body = await request.json();
      const headers = { "authentication-results": body.AuthenticationResults || "", spf: body.SPF || "", dkim: body.DKIM || "" };
      const result = await handleInbound({
        message: { channel: "email", fromEmail: body.From || body.from, text: body.TextBody || body.text || "", headers },
        clients: loadClients(),
        env,
      });
      return json(result);
    }
    if (url.pathname === "/webhooks/stripe" && request.method === "POST") {
      const raw = await request.text();
      const mode = env.STRIPE_MODE || "test";
      const secret = mode === "live" ? env.STRIPE_WEBHOOK_SECRET_LIVE : env.STRIPE_WEBHOOK_SECRET;
      const valid = stripeSignatureValid({ secret, header: request.headers.get("stripe-signature"), rawBody: raw });
      if (!valid && env.DRY_RUN !== "true") return new Response("invalid signature", { status: 401 });
      const event = JSON.parse(raw);
      const result = applyPayment({
        event,
        mode,
        products: loadProducts(),
        clients: loadClients(),
        learnDb: emptyLearnDb(),
      });
      return json(result);
    }
    if (url.pathname === "/intake" && request.method === "POST") {
      const body = await request.json();
      if (body.company_website) return json({ ok: true, spam: true });
      if (!body.name || !body.email || !body.consent) return json({ ok: false, error: "missing_fields" }, 400);
      return json({ ok: true, stored: Boolean(env.DB), emailed: env.OWNER_EMAIL || "hello@siteowned.ai", testMode: (env.STRIPE_MODE || "test") !== "live" });
    }
    return new Response("not found", { status: 404 });
  },
};
