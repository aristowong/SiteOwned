import { compareTotals, money, yearlyBill } from "./compare-math.js";

const roots = document.querySelectorAll("[data-compare]");

function option(value, label) {
  return `<option value="${value}">${label}</option>`;
}

function field(html) {
  return `<label class="compare-field">${html}</label>`;
}

function render(root, data) {
  const locked = root.getAttribute("data-audience");
  const compact = root.hasAttribute("data-compact");
  const state = {
    years: 3,
    audience: locked || "small-business",
    platform: "squarespace",
    planId: locked === "clinic" ? "core" : "basic",
    billing: "annual",
    setup: data.agency.setupDefault,
    monthly: data.agency.monthlyDefault,
    customMonthly: 50,
    packageId: data.siteowned[locked || "small-business"].defaultPackage,
    care: false,
  };

  root.innerHTML = `
    <form class="compare-form" data-form>
      <div class="compare-controls">
        ${locked ? "" : `<div class="compare-tabs" role="tablist">
          <button type="button" data-audience-btn="small-business" aria-pressed="true">Small business</button>
          <button type="button" data-audience-btn="clinic" aria-pressed="false">Clinic</button>
        </div>`}
        ${field(`Years <input type="range" name="years" min="1" max="5" value="3" aria-describedby="years-readout"> <span id="years-readout">3 years</span>`)}
        ${field(`What you pay today <select name="platform">
          ${option("squarespace", "Squarespace")}
          ${option("wix", "Wix")}
          ${option("agency", "Typical agency (estimate)")}
          ${option("custom", "A monthly cost I type in")}
        </select>`)}
        <div data-plan-wrap>${field(`Plan <select name="plan"></select>`)}</div>
        <div data-bill-wrap>${field(`Billing <select name="billing">
          ${option("annual", "Annual plan")}
          ${option("monthly", "Month-to-month")}
        </select>`)}</div>
        <div data-agency-wrap hidden>
          ${field(`Setup estimate, USD <input name="setup" type="number" min="0" step="1" value="${state.setup}">`)}
          ${field(`Monthly retainer, USD <input name="retainer" type="number" min="0" step="1" value="${state.monthly}">`)}
        </div>
        <div data-custom-wrap hidden>
          ${field(`What you pay per month, USD <input name="custom" type="number" min="0" step="1" value="${state.customMonthly}">`)}
        </div>
        ${field(`SiteOwned package <select name="package"></select>`)}
        ${field(`<input name="care" type="checkbox"> Add the optional care plan`)}
      </div>
      <p class="compare-save" data-save aria-live="polite"></p>
      <div class="compare-bars" data-bars></div>
      <table class="compare-table" data-table></table>
      <p class="compare-note" data-note></p>
    </form>
    ${compact ? `<p><a href="${root.getAttribute("data-more") || "compare/"}">Open the full comparison</a></p>` : ""}
  `;

  const form = root.querySelector("[data-form]");
  const planSelect = form.elements.plan;
  const packageSelect = form.elements.package;
  const billWrap = root.querySelector("[data-bill-wrap]");
  const planWrap = root.querySelector("[data-plan-wrap]");
  const agencyWrap = root.querySelector("[data-agency-wrap]");
  const customWrap = root.querySelector("[data-custom-wrap]");

  function plans() {
    return state.platform === "wix" ? data.wix.plans : data.squarespace.plans;
  }

  function fillPlans() {
    const list = plans();
    if (!list.some((plan) => plan.id === state.planId)) state.planId = list[0].id;
    planSelect.innerHTML = list.map((plan) => option(plan.id, plan.name)).join("");
    planSelect.value = state.planId;
    const plan = list.find((item) => item.id === state.planId);
    const monthly = form.elements.billing.querySelector('[value="monthly"]');
    monthly.disabled = plan.monthly == null;
    if (plan.monthly == null) state.billing = "annual";
    form.elements.billing.value = state.billing;
  }

  function fillPackages() {
    const group = data.siteowned[state.audience];
    packageSelect.innerHTML = group.packages.map((item) => option(item.id, `${item.name} ($${item.amount})`)).join("");
    if (!group.packages.some((item) => item.id === state.packageId)) state.packageId = group.defaultPackage;
    packageSelect.value = state.packageId;
  }

  function selectedPlan() {
    return plans().find((plan) => plan.id === state.planId);
  }

  function update() {
    const group = data.siteowned[state.audience];
    const pack = group.packages.find((item) => item.id === state.packageId);
    const plan = selectedPlan();
    const result = compareTotals({
      years: state.years,
      platform: state.platform,
      plan,
      billing: state.billing,
      setup: state.setup,
      monthly: state.monthly,
      customMonthly: state.customMonthly,
      packageAmount: pack.amount,
      care: state.care,
      careMonthly: group.careMonthly,
    });
    const saveEl = root.querySelector("[data-save]");
    const yearsLabel = state.years === 1 ? "1 year" : `${state.years} years`;
    form.querySelector("#years-readout").textContent = yearsLabel;
    form.elements.years.setAttribute("aria-valuetext", yearsLabel);
    if (result.save >= 0) {
      saveEl.textContent = `You save ${money(result.save)} over ${yearsLabel}.`;
    } else {
      saveEl.textContent = `SiteOwned costs ${money(Math.abs(result.save))} more over ${yearsLabel} with these choices.`;
    }
    const max = Math.max(result.current, result.siteowned, 1);
    const currentName = state.platform === "agency" ? "Typical agency estimate" : state.platform === "custom" ? "The monthly cost you typed" : `${state.platform === "wix" ? "Wix" : "Squarespace"} ${plan.name}`;
    root.querySelector("[data-bars]").innerHTML = [
      bar(currentName, result.current, max),
      bar(`SiteOwned ${pack.name}${state.care ? " + care plan" : ""}`, result.siteowned, max),
    ].join("");
    root.querySelector("[data-table]").innerHTML = `<caption>Cost by year</caption><thead><tr><th>Year</th><th>${currentName}</th><th>SiteOwned</th></tr></thead><tbody>
      ${result.rows.map((row) => `<tr><th>${row.year}</th><td>${money(row.current)}</td><td>${money(row.siteowned)}</td></tr>`).join("")}
    </tbody>`;
    const rate = state.platform === "squarespace" || state.platform === "wix"
      ? `${money(yearlyBill(plan, state.billing))} per year (${state.billing === "monthly" ? "month-to-month" : "annual plan"}).`
      : "";
    root.querySelector("[data-note]").textContent = state.platform === "agency"
      ? data.agency.note
      : state.platform === "wix"
        ? `${data.wix.billingNote} ${rate}`
        : state.platform === "custom"
          ? "This row uses only the monthly number you typed."
          : rate;
  }

  function bar(label, amount, max) {
    const width = Math.max(4, Math.round((amount / max) * 100));
    return `<div class="bar-row"><span>${label}</span><div class="bar-track"><div class="bar-fill" style="width:${width}%"></div></div><strong>${money(amount)}</strong></div>`;
  }

  root.querySelectorAll("[data-audience-btn]").forEach((button) => {
    button.addEventListener("click", () => {
      state.audience = button.getAttribute("data-audience-btn");
      root.querySelectorAll("[data-audience-btn]").forEach((item) => item.setAttribute("aria-pressed", String(item === button)));
      fillPackages();
      update();
    });
  });

  form.addEventListener("input", () => {
    state.years = Number(form.elements.years.value);
    state.platform = form.elements.platform.value;
    state.planId = form.elements.plan.value;
    state.billing = form.elements.billing.value;
    state.setup = Number(form.elements.setup.value) || 0;
    state.monthly = Number(form.elements.retainer.value) || 0;
    state.customMonthly = Number(form.elements.custom.value) || 0;
    state.packageId = form.elements.package.value;
    state.care = form.elements.care.checked;
    const subscription = state.platform === "squarespace" || state.platform === "wix";
    planWrap.hidden = !subscription;
    billWrap.hidden = state.platform !== "squarespace";
    agencyWrap.hidden = state.platform !== "agency";
    customWrap.hidden = state.platform !== "custom";
    if (subscription) fillPlans();
    update();
  });

  fillPlans();
  fillPackages();
  update();
}

Promise.all([...roots].map(async (root) => {
  const url = new URL(root.getAttribute("data-source"), document.baseURI);
  const data = await fetch(url).then((response) => response.json());
  render(root, data);
}));
