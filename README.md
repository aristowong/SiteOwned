# SiteOwned

Marketing site for [SiteOwned](https://siteowned.ai) and [ClinicSite](https://clinicsite.ai). It is a static site: HTML, one CSS file, and a small script for the menu and the mailto form. There is no build step and no server.

The pages are the product pitch. SiteOwned builds or moves a small-business website with AI, hosts it on a free static plan, and leaves the files with the owner. The only required ongoing cost described on the site is the domain, about $12 a year. Optional edit plans are separate.

## Pages

| URL | File | Purpose |
| --- | --- | --- |
| `/` | `index.html` | Home: pitch, how it works, cost in words, two audiences, FAQ, free site plan |
| `/small-business/` | `small-business/index.html` | New small businesses. AI Move $249, AI Launch $399, AI Edits $9/month optional |
| `/clinics/` | `clinics/index.html` | ClinicSite for PT, OT, speech, and chiropractic practices |
| `/clinics/sample/` | `clinics/sample/index.html` | Fictional clinic layout. Labeled as an example. `noindex` |
| `/course/` | `course/index.html` | Own Your Site, the DIY course |
| *(unknown URLs)* | `404.html` | Not-found page |

Shared files:

- `css/styles.css` — all layout and visual design
- `js/site.js` — mobile menu state and the mailto form
- `assets/favicon.svg` — icon
- `assets/og.png` — social image (1200×630)
- `assets/fonts/` — Fraunces and Outfit, self-hosted under the SIL Open Font License (`Fraunces-OFL.txt`, `Outfit-OFL.txt`)
- `robots.txt`, `sitemap.xml` — the sample clinic page is left out of the sitemap

Contact buttons and forms use `mailto:hello@siteowned.ai`. Replace that address before launch. Submitting a form opens the visitor’s email app. Nothing is posted to a server.

Merrin & Quill Pediatric Therapy, including Rowan Hale and the sample phone number, is fictional. Do not add testimonials, client logos, or statistics the business has not published.

## Preview locally

From the repository root:

```bash
python3 -m http.server 8080
```

Open `http://localhost:8080/`. Use a local server so root paths such as `/css/styles.css` resolve. Opening the HTML files directly from disk will not load the CSS.

## Deploy on GitHub Pages

The workflow in `.github/workflows/pages.yml` publishes the site on every push to `main`.

1. Push the repository to GitHub.
2. In the repository, go to **Settings → Pages → Build and deployment**.
3. Set **Source** to **GitHub Actions**.
4. Push to `main`, or run the “Deploy GitHub Pages” workflow by hand.

The workflow copies the site to `_site` (skipping `.git` and `.github`) and deploys that folder. `.nojekyll` is included so GitHub Pages does not run Jekyll.

### Custom domain

In **Settings → Pages**, set the custom domain to `siteowned.ai` and add the DNS records GitHub shows you. After DNS is in place you can commit a `CNAME` file containing:

```text
siteowned.ai
```

Leave `CNAME` out until the domain is ready. A `CNAME` file tells GitHub Pages to serve only that hostname.

`clinicsite.ai` can send people to the clinic page. A simple approach is a redirect from `https://clinicsite.ai/*` to `https://siteowned.ai/clinics/`.

## Deploy on Cloudflare Pages

1. Create a Pages project and connect this repository.
2. Production branch: `main`.
3. Build command: leave empty. There is nothing to compile.
4. Build output directory: `/` (the repository root).
5. Add the custom domain `siteowned.ai`.

`_headers` sets a long cache lifetime for the font files. Cloudflare Pages reads that file; GitHub Pages ignores it.

To serve ClinicSite on its own hostname, attach `clinicsite.ai` and add a bulk redirect to `https://siteowned.ai/clinics/`.

## Editing

Each page repeats the header and footer so the site stays hostable as plain files. If you change navigation, update it in every HTML file, including `404.html`.

Prices, package names, and the course modules on the pages are the published offer. Change them in the HTML when the offer changes, and keep the FAQ answers in `index.html` matched to the FAQ structured data in that file’s `<head>`.
