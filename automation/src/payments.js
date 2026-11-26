import { normalizeEmail } from "./registry.js";
import { createStudent } from "./learn-core.js";

export function productFromEvent(event, products) {
  const session = event.data?.object || {};
  const fromMeta = session.metadata?.product_id || session.metadata?.productId;
  if (fromMeta) return products.find((item) => item.id === fromMeta) || null;
  const priceId = session.line_items?.data?.[0]?.price?.id || session.price_id;
  if (!priceId) return null;
  return products.find((item) => item.test.priceId === priceId || item.live.priceId === priceId) || null;
}

export function modeAllowsEvent(mode, event) {
  const live = Boolean(event.livemode || event.data?.object?.livemode);
  if (mode === "live") return live;
  return !live;
}

export function applyPayment({ event, mode, products, clients, learnDb, now = new Date().toISOString() }) {
  if (!modeAllowsEvent(mode, event)) {
    return { ok: false, error: "mode_mismatch" };
  }
  if (event.type !== "checkout.session.completed" && event.type !== "customer.subscription.deleted") {
    return { ok: true, ignored: event.type };
  }
  const session = event.data.object;
  const email = normalizeEmail(session.customer_email || session.customer_details?.email);
  const product = productFromEvent(event, products);
  if (!product) return { ok: false, error: "unknown_product" };

  if (event.type === "customer.subscription.deleted") {
    const client = clients.find((item) => (item.emails || []).some((value) => normalizeEmail(value) === email));
    if (client) {
      client.active = false;
      client.plan = "";
    }
    return { ok: true, canceled: true, email, productId: product.id };
  }

  const client = clients.find((item) => (item.emails || []).some((value) => normalizeEmail(value) === email));
  if (client) {
    client.active = true;
    client.plan = product.id;
    client.updatedAt = now;
  }
  let student = null;
  if (product.courseTier) {
    student = createStudent(learnDb, {
      email,
      name: session.customer_details?.name || email,
      tier: product.courseTier,
      testMode: mode !== "live",
      now,
    });
  }
  const delivery = product.courseTier
    ? { to: email, subject: "Your SiteOwned course", text: "Your course is ready at /learn/. In test mode the sign-in link is shown on that page." }
    : null;
  return { ok: true, email, productId: product.id, clientId: client?.id || null, student, delivery, testMode: mode !== "live" };
}
