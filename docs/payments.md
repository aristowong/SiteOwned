# Payments

Draft for operators. Public checkout pages do not repeat this comparison.

There is no free card processing. A processor that charges no monthly fee still takes a cut of each successful charge. ACH or bank debit is usually cheaper than cards on larger one-time packages. Numbers below are from the vendors' own pages as fetched for this draft. Check them again before you turn on live mode. They change.

## Comparison

| Processor | What we would use it for | Published fee (US, this draft) | Monthly fee | Fit for a static site + Worker |
| --- | --- | --- | --- | --- |
| Stripe | Cards, ACH, subscriptions, customer portal, webhooks | Cards and wallets: 2.9% + 30¢ per successful domestic card charge. ACH Direct Debit: 0.8%, $5 cap. [stripe.com/pricing](https://stripe.com/pricing) | None on this standard pricing | Best fit. Payment Links work from HTML. Webhooks have a signature. Test mode and the Stripe CLI are built in. |
| Square | Online links or API | Square's public pricing table lists Online at 3.3% + 30¢ on the free plan, and Online API at 2.9% + 30¢. ACH via API: 1% with a $1 minimum and $5 cap. [squareup.com/us/en/pricing](https://squareup.com/us/en/pricing) and [developer.squareup.com/docs/payments-pricing](https://developer.squareup.com/docs/payments-pricing) | None stated for processing | Works, but the simple online rate is higher than Stripe's card rate. |
| PayPal | Checkout buttons | PayPal Checkout 3.49% + fixed fee. US dollar fixed fee 0.49. Standard credit and debit cards 2.99% + fixed fee. [paypal.com/us/business/paypal-business-fees](https://www.paypal.com/us/business/paypal-business-fees) and [paypal.com/us/business/fees](https://www.paypal.com/us/business/fees) | None stated on that fee table | Easy buttons. Higher checkout rate. Weaker match for one Worker that also runs the course and care plans. |
| Lemon Squeezy | Merchant of record, especially a digital course | 5% + 50¢ per transaction. $0/month for the ecommerce plan. [lemonsqueezy.com/pricing](https://www.lemonsqueezy.com/pricing) | $0 | They file sales tax. The rate is higher than Stripe on a $49 or $399 charge. |
| Gumroad | Merchant of record for a course | 10% + $0.50 on direct sales. 30% when the buyer comes from Gumroad Discover. [gumroad.com/pricing](https://gumroad.com/pricing) | None stated | Simple course hosting. The fee is the highest of this set, and the course would live on their site. |

## Recommendation

Use Stripe for the one-time packages, the $9 and $19 care plans, and the course.

- The card rate is the lowest straightforward online rate in this set (2.9% + 30¢).
- ACH Direct Debit at 0.8% with a $5 cap is the lower-fee option for a $399 or $699 package when the buyer will pay from a bank account.
- Stripe Customer Portal covers cancel and card update without a second product.
- Checkout Payment Links drop onto this static site. The Worker only verifies the webhook.
- Test mode does not move real money. Live mode still has no monthly Stripe fee; you pay per successful charge.

Lemon Squeezy or Gumroad are the merchant-of-record option if sales tax on the course becomes a burden. Their fees are higher. This repo does not wire them in. Stripe is the path that is built.

## What the site does

`payments-config.json` at the repo root is the only price-id and link file. `mode` defaults to `test`. Checkout reads it and shows a TEST MODE banner. Links that still start with `TODO` fall back to `mailto:hello@siteowned.ai`.

Products: AI Move $249, AI Launch $399, small-business AI Edits $9/month, ClinicSite AI Move $399, ClinicSite AI Launch $699, ClinicSite AI Edits $19/month, course $49, course + templates $89, course + 45-minute call $199.

The Worker route `POST /webhooks/stripe` checks the Stripe signature, ignores events whose livemode does not match `STRIPE_MODE`, marks a known client active, and for a course price creates a student and a delivery note.

## Setup

1. Create a Stripe account. Stay in test mode.
2. Create a Product and Price for each row in `payments-config.json`. Copy the test Price id into `test.priceId`.
3. Create a Payment Link for each price. Put the test URL in `test.link`. Add metadata `product_id` set to the `id` in the config (`sb-move`, `course`, and so on).
4. Turn on the Customer Portal. Put the test portal link in `billingPortal.test`.
5. Add a webhook endpoint to the Worker URL path `/webhooks/stripe`. Subscribe to `checkout.session.completed` and `customer.subscription.deleted`. Put the test signing secret in `STRIPE_WEBHOOK_SECRET` with `wrangler secret put`. Do not commit it.
6. Set `STRIPE_MODE=test` until a test card payment marks a client active. See `docs/TESTING-PAYMENTS.md`.
7. Live mode is a separate set of prices, links, and `STRIPE_WEBHOOK_SECRET_LIVE`. Switch `mode` in `payments-config.json` and `STRIPE_MODE` only after the test checklist passes.

## Cost shape

Estimates, not a quote. A $399 card charge at 2.9% + 30¢ is about $11.87 to Stripe. The same charge on ACH at 0.8% is about $3.19, under the $5 cap. A $49 course on a card is about $1.72. A $9 care plan is about $0.56 each month. Confirm on [stripe.com/pricing](https://stripe.com/pricing) before you publish live links.
