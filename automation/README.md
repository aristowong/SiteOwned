# SiteOwned update worker

Email is the only channel turned on. Google Voice and Twilio adapters are in the code and stay off until you set their flags to `true`.

Placeholder secrets only. Do not put real keys in this folder.

## Free-tier defaults

- Cloudflare Workers, KV, and D1 on the Workers Free plan. See [Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/).
- Inbound email: [Cloudflare Email Routing](https://developers.cloudflare.com/email-routing/get-started/) (no monthly plan fee).
- LLM default: Gemini free tier when `GEMINI_API_KEY` is set. See [Gemini API pricing](https://ai.google.dev/gemini-api/docs/pricing). With no key, dry-run returns a sample patch and spends nothing.
- Outbound mail in test mode is shown on screen. Optional [Resend](https://resend.com/pricing) only if you want the worker to send.
- SMS is off. Twilio has no ongoing free tier. Google Voice forwarding is free but unofficial and also off.

## Dry run

```bash
cd automation
npm test
```

`DRY_RUN=true` and `STRIPE_MODE=test` are the wrangler defaults. Sample payloads live in `payloads/`.

## Turn on later

- Text via Google Voice: forward `txt.voice.google.com` mail into this worker and set `CHANNEL_GOOGLE_VOICE=true`. See `docs/architecture.md`.
- Twilio: set `CHANNEL_TWILIO=true` and `TWILIO_AUTH_TOKEN`. Leave this off unless you accept the per-message cost.
