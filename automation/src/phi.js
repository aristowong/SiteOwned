const PATTERNS = [
  /\b\d{3}-\d{2}-\d{4}\b/,
  /\b(?:mrn|medical record)\b\s*[:#]?\s*\w+/i,
  /\b(?:dob|date of birth)\b\s*[:#]?\s*\d/i,
  /\bpatient\s+(?:name|id|record|history)\b/i,
  /\bdiagnosis\s*:/i,
  /\b(?:hiv|cancer|pregnancy)\s+(?:status|diagnosis)\b/i,
];

export function looksLikePhi(text) {
  const value = String(text || "");
  return PATTERNS.some((pattern) => pattern.test(value));
}
