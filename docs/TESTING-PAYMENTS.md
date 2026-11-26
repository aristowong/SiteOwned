# Testing payments

No real money. `payments-config.json` ships with `"mode": "test"`. The checkout page shows a TEST MODE banner. Links that still say `TODO` do not open Stripe. Use the simulate button on that page, or the Stripe CLI, before you replace the TODOs.

Official test cards are from [Stripe's testing docs](https://docs.stripe.com/testing). Use any future expiry and any 3-digit CVC.

| Result | Card number |
| --- | --- |
| Success | 4242 4242 4242 4242 |
| Generic decline | 4000 0000 0000 0002 |
| 3D Secure required | 4000 0025 0000 3155 |

## A. Simulate on the site (no Stripe account yet)

1. Open `/checkout/?item=course`.
2. Confirm the TEST MODE banner.
3. Enter a name and email. Click "Simulate test purchase".
4. Open `/learn/`. Use the sign-in link shown on the page (test mode does not send mail).
5. The student should exist with tier `course` and `testMode` true.

This path stores the student in the browser. It does not call Stripe.

## B. Stripe CLI against the Worker

Install the [Stripe CLI](https://docs.stripe.com/stripe-cli). From a machine that can reach the Worker:

```bash
stripe listen --forward-to https://YOUR-WORKER.workers.dev/webhooks/stripe
stripe trigger checkout.session.completed
```

`stripe listen` prints a webhook signing secret. Put that in `STRIPE_WEBHOOK_SECRET` for the test Worker. `STRIPE_MODE` must stay `test`. The Worker rejects events with `livemode: true` while it is in test mode.

The repo sample is `automation/payloads/stripe-checkout-course.json`. `npm test` in `automation/` checks that this event creates a test student and that a live-mode event is rejected.

To watch a specific client, send a checkout event whose `customer_email` is `owner@merrin-quill.example` and whose metadata `product_id` is `clinic-launch`. The sample clinic record should flip to active. A course event should also queue a delivery note (`Your course is ready at /learn/`).

## Switch to live

1. Repeat product, price, and Payment Link setup in live mode. Fill `live.link` and `live.priceId`. Do not reuse test ids.
2. Create a live webhook endpoint and `wrangler secret put STRIPE_WEBHOOK_SECRET_LIVE`.
3. Run one more test-mode payment and confirm the banner is still up.
4. Change `payments-config.json` `mode` to `live` and the Worker var `STRIPE_MODE` to `live` in the same release.
5. The Worker then rejects `livemode: false` events, so a test card cannot mark a live client active.
6. Pay yourself a $0.50 test is not available in live mode. Use a real card you control, then refund it from the Stripe Dashboard if you only wanted a smoke test.
