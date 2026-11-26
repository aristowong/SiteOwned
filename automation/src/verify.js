import { createHmac, timingSafeEqual } from "node:crypto";

function safeEqual(a, b) {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export function emailAuthPassed(headers = {}) {
  const bag = {};
  for (const [key, value] of Object.entries(headers)) bag[key.toLowerCase()] = String(value);
  const auth = bag["authentication-results"] || "";
  const spf = /spf=pass/i.test(auth) || /^pass$/i.test(bag.spf || bag["x-spf"] || "");
  const dkim = /dkim=pass/i.test(auth) || /^pass$/i.test(bag.dkim || bag["x-dkim"] || "");
  return spf && dkim;
}

export function twilioSignature({ url, params, authToken }) {
  const names = Object.keys(params || {}).sort();
  let payload = url;
  for (const name of names) payload += name + params[name];
  return createHmac("sha1", authToken).update(payload).digest("base64");
}

export function twilioSignatureValid({ url, params, header, authToken }) {
  if (!header || !authToken) return false;
  return safeEqual(header, twilioSignature({ url, params, authToken }));
}

export function stripeSignature({ secret, timestamp, rawBody }) {
  return createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest("hex");
}

export function stripeSignatureValid({ secret, header, rawBody, now = Date.now(), toleranceSec = 300 }) {
  if (!secret || !header || rawBody == null) return false;
  const parts = Object.fromEntries(String(header).split(",").map((piece) => piece.split("=")));
  const timestamp = parts.t;
  const v1 = parts.v1;
  if (!timestamp || !v1) return false;
  const age = Math.abs(now / 1000 - Number(timestamp));
  if (!Number.isFinite(age) || age > toleranceSec) return false;
  return safeEqual(v1, stripeSignature({ secret, timestamp, rawBody }));
}
