# LMS

Draft for operators. The public course page does not include this comparison.

## Comparison

Hosted course sites charge a monthly plan, a revenue share, or both. This project is meant to stay at $0 a month, so those plans lose.

| Option | Cost shape | Progress tracking | Payments | Own the content | Why it lost or won |
| --- | --- | --- | --- | --- | --- |
| Teachable, Thinkific, Podia, Kajabi, LearnWorlds | Paid plans. Confirm the current price on each vendor's pricing page before you reconsider them. | Yes | Their checkout or a connection | Their site, export varies | Monthly fees. Out of scope for a $0 build. |
| Lemon Squeezy / Gumroad course hosting | 5% + 50¢ or 10% + $0.50, no monthly ecommerce fee. [Lemon Squeezy](https://www.lemonsqueezy.com/pricing), [Gumroad](https://gumroad.com/pricing) | Weak or theirs | Theirs | Theirs | Higher fees than Stripe, and the lessons would not sit in this repo. |
| Self-built on this site + Worker + D1 + Stripe | Workers Free, D1 Free, Stripe per transaction only when live. [Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/), [Stripe](https://stripe.com/pricing) | Lessons completed, quiz score, percent | Stripe, already chosen | Markdown in this repo | Fits the $0 monthly constraint and the brand. |

## Recommendation

Build the LMS here. A hosted LMS would add a subscription the business is trying not to charge. Stripe already covers the $49 / $89 / $199 prices. Cloudflare's free Worker and D1 tiers cover a small class. Students sign in with a magic link. Test mode shows that link on the page so you do not pay an email provider.

## Architecture

`/learn/` is static HTML. Lesson bodies are `automation/content/lessons/*.md`. The browser loads `automation/src/learn-core.js` for progress math. When `learnApi` in `payments-config.json` is a Worker URL, the same rules run against D1. Until then, test purchases live in the browser's local storage under `siteowned.learn`.

Tiers: `course` (lessons), `templates` (lessons plus the template link), `call` (lessons plus the booking link). The $199 call does not include templates. Every tier includes the ClinicSite bonus module.

## Data model

See `automation/schema.sql`: `students`, `progress`, `magic_links`, `sessions`.

## Setup

1. Leave `learnApi` empty to use the on-site test classroom.
2. To store students on Cloudflare, create the D1 database from `automation/README.md` and set `learnApi` to `https://YOUR-WORKER.workers.dev`.
3. Optional mail: `RESEND_API_KEY`. Without it, test mode prints the magic link. Resend's free plan is listed on [resend.com/pricing](https://resend.com/pricing). Do not invent a volume; read their page.
4. Add lessons by dropping a markdown file in `automation/content/lessons/` and a row in `LESSONS` inside `learn-core.js`.

## View progress

Open `/learn/admin.html` while a test session exists, or call the Worker admin route with `ADMIN_TOKEN` once that secret is set. CSV export is on the admin page.
