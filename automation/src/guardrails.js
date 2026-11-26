const RISKY = [
  { reason: "page deletion", pattern: /\b(?:delete|remove)\b[\s\S]{0,40}\bpage\b/i },
  { reason: "legal or policy text", pattern: /\b(?:privacy policy|terms of service|terms of use|refund policy)\b/i },
  { reason: "redesign", pattern: /\b(?:redesign|rebrand|new layout)\b/i },
  { reason: "medical claim", pattern: /\b(?:cure|guaranteed results|hipaa[- ]compliant website)\b/i },
];

export function classifyRequest(text) {
  for (const rule of RISKY) {
    if (rule.pattern.test(String(text || ""))) return { risky: true, reason: rule.reason };
  }
  return { risky: false, reason: "" };
}

export function overCap(count, cap) {
  return Number(count) >= Number(cap);
}
