import { normalizePhone } from "./registry.js";

const FOOTER_MARKERS = [
  "\n--",
  "YOUR ACCOUNT",
  "To respond, reply to this email",
  "https://voice.google.com",
  "You received this email because",
];

export function isGoogleVoiceAddress(from) {
  return /@txt\.voice\.google\.com>?$/i.test(String(from || "").trim());
}

export function parseGoogleVoiceAddress(from) {
  const cleaned = String(from || "").replace(/^.*</, "").replace(/>.*$/, "").trim();
  const match = cleaned.match(/^([^@]+)@txt\.voice\.google\.com$/i);
  if (!match) return null;
  const parts = match[1].split(".");
  if (parts.length < 3) return null;
  const gvNumber = normalizePhone(parts[0]);
  const senderNumber = normalizePhone(parts[1]);
  if (gvNumber.length < 11 || senderNumber.length < 11) return null;
  return { gvNumber, senderNumber, replyTo: cleaned };
}

export function stripGoogleVoiceFooter(body) {
  const text = String(body || "").replace(/\r\n/g, "\n");
  let cut = text.length;
  for (const marker of FOOTER_MARKERS) {
    const at = text.indexOf(marker);
    if (at >= 0) cut = Math.min(cut, at);
  }
  return text.slice(0, cut).trim();
}

export function googleVoiceReply(summary, previewUrl) {
  const line = previewUrl ? `${summary} Preview: ${previewUrl}` : summary;
  return line.replace(/\s+/g, " ").trim().slice(0, 300);
}
