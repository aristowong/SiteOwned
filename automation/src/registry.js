export function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

export function normalizePhone(value) {
  const digits = String(value || "").replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  if (digits.length > 11) return `+${digits}`;
  return digits ? `+${digits}` : "";
}

export function listClients(data) {
  if (Array.isArray(data)) return data;
  return data.clients || [];
}

export function findByEmail(clients, email) {
  const needle = normalizeEmail(email);
  return clients.find((client) => (client.emails || []).some((item) => normalizeEmail(item) === needle)) || null;
}

export function findByPhone(clients, phone) {
  const needle = normalizePhone(phone);
  return clients.find((client) => (client.phones || []).some((item) => normalizePhone(item) === needle)) || null;
}

export function monthKey(date = new Date()) {
  return date.toISOString().slice(0, 7);
}
