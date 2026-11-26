export function money(amount) {
  const sign = amount < 0 ? "-" : "";
  return sign + "$" + Math.abs(Math.round(amount)).toLocaleString("en-US");
}

export function yearlyBill(plan, billing) {
  if (billing === "monthly" && plan.monthly != null) return plan.monthly * 12;
  if (plan.annualTotal != null) return plan.annualTotal;
  return plan.annualPerMonth * 12;
}

export function compareTotals(input) {
  const years = input.years;
  const rows = [];
  let current = 0;
  if (input.platform === "agency") {
    current = input.setup + input.monthly * 12 * years;
  } else if (input.platform === "custom") {
    current = input.customMonthly * 12 * years;
  } else {
    const perYear = yearlyBill(input.plan, input.billing);
    current = perYear * years;
  }
  const care = input.care ? input.careMonthly * 12 * years : 0;
  const siteowned = input.packageAmount + care;
  for (let year = 1; year <= years; year += 1) {
    let currentYear = 0;
    if (input.platform === "agency") currentYear = (year === 1 ? input.setup : 0) + input.monthly * 12;
    else if (input.platform === "custom") currentYear = input.customMonthly * 12;
    else currentYear = yearlyBill(input.plan, input.billing);
    const ownedYear = (year === 1 ? input.packageAmount : 0) + (input.care ? input.careMonthly * 12 : 0);
    rows.push({ year, current: currentYear, siteowned: ownedYear });
  }
  return { current, siteowned, save: current - siteowned, rows };
}
