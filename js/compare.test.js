import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { compareTotals } from "./compare-math.js";

const data = JSON.parse(readFileSync(new URL("../data/pricing-compare.json", import.meta.url)));

test("three years of Squarespace Basic annual versus AI Launch", () => {
  const plan = data.squarespace.plans.find((item) => item.id === "basic");
  const result = compareTotals({
    years: 3,
    platform: "squarespace",
    plan,
    billing: "annual",
    packageAmount: 399,
    care: false,
    careMonthly: 9,
  });
  assert.equal(result.current, 228 * 3);
  assert.equal(result.siteowned, 399);
  assert.equal(result.save, 684 - 399);
  assert.equal(result.rows[0].siteowned, 399);
  assert.equal(result.rows[1].siteowned, 0);
});

test("clinic care plan adds 19 dollars a month", () => {
  const plan = data.wix.plans.find((item) => item.id === "core");
  const result = compareTotals({
    years: 3,
    platform: "wix",
    plan,
    billing: "annual",
    packageAmount: 699,
    care: true,
    careMonthly: 19,
  });
  assert.equal(result.current, 29 * 12 * 3);
  assert.equal(result.siteowned, 699 + 19 * 36);
});

test("agency estimate uses typed setup and retainer", () => {
  const result = compareTotals({
    years: 2,
    platform: "agency",
    setup: 1249,
    monthly: 100,
    packageAmount: 249,
    care: false,
    careMonthly: 9,
  });
  assert.equal(result.current, 1249 + 100 * 24);
  assert.equal(result.rows[0].current, 1249 + 1200);
  assert.equal(result.rows[1].current, 1200);
});
