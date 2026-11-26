import { createStudent, loadBrowserDb, saveBrowserDb } from "../automation/src/learn-core.js";

const banner = document.querySelector("[data-test-banner]");
const root = document.querySelector("[data-checkout]");
const params = new URLSearchParams(location.search);
const itemId = params.get("item") || "";

function money(product) {
  const suffix = product.interval ? `/${product.interval}` : " once";
  return `$${product.amount}${suffix}`;
}

function ready(link) {
  return typeof link === "string" && link.startsWith("https://");
}

fetch(new URL("../payments-config.json", import.meta.url))
  .then((response) => response.json())
  .then((config) => {
    const mode = config.mode === "live" ? "live" : "test";
    if (mode === "test") banner.hidden = false;
    const product = config.products.find((entry) => entry.id === itemId) || null;
    const list = product ? [product] : config.products;
    root.innerHTML = list.map((entry) => {
      const slot = entry[mode] || entry.test;
      const pay = ready(slot.link)
        ? `<a class="button" href="${slot.link}">Pay ${money(entry)}</a>`
        : `<a class="button" href="mailto:${config.supportEmail}?subject=${encodeURIComponent(entry.name)}">Email us to pay ${money(entry)}</a>`;
      const simulate = mode === "test"
        ? `<button class="button button--ghost" type="button" data-simulate="${entry.id}">Simulate test purchase</button>`
        : "";
      return `<article class="price">
        <p class="badge">${mode === "test" ? "Test mode" : "Live"}</p>
        <h2>${entry.name}</h2>
        <p class="price-amount"><span>$</span>${entry.amount}</p>
        <p>${entry.blurb}</p>
        <p class="price-note">Price id: ${slot.priceId}</p>
        ${pay}
        ${simulate}
      </article>`;
    }).join("");
    const portal = (config.billingPortal || {})[mode];
    const portalLink = ready(portal)
      ? `<a href="${portal}">Open the billing portal</a>`
      : `<a href="mailto:${config.supportEmail}?subject=Billing%20portal">Email us about a card update or cancellation</a>`;
    root.insertAdjacentHTML("beforeend", `<p class="lede">Care plans can be canceled in the billing portal. ${portalLink}. Nothing is charged by the simulate button.</p>`);
    root.addEventListener("click", (event) => {
      const button = event.target.closest("[data-simulate]");
      if (!button) return;
      const chosen = config.products.find((entry) => entry.id === button.getAttribute("data-simulate"));
      const email = window.prompt("Email for this test purchase", "student@example.com");
      if (!email) return;
      let saved = email;
      if (chosen.courseTier) {
        const data = loadBrowserDb();
        const student = createStudent(data, { email, name: email, tier: chosen.courseTier, testMode: true });
        saveBrowserDb(data);
        saved = student.email;
      }
      const note = document.createElement("p");
      note.className = "lede";
      note.textContent = chosen.courseTier
        ? `Test purchase saved for ${saved}. Open the course and use the on-screen sign-in link. No card was charged.`
        : `Test purchase noted for ${chosen.id}. No card was charged. Turning on email edits still needs the Stripe test webhook.`;
      button.after(note);
    });
  })
  .catch(() => {
    root.textContent = "Checkout config did not load.";
  });
