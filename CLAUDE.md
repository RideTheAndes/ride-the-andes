# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

The marketing/booking website for Ride The Andes S.A.S., a boutique cycling tour operator in Boyacá, Colombia (ridetheandes.co). It is a **static site with no build system, no package manager, and no framework** — plain HTML/CSS/vanilla JS deployed as-is. There is nothing to `npm install`, build, lint, or test; editing the HTML/CSS/JS files directly *is* the development workflow.

## Deploy & workflow

- Hosted on Netlify, connected to GitHub. Every `git push` to `main` deploys automatically — there is no CI/build step.
- Before merging any change to `reservar.html` or `assets/js/site.js`, push to a branch and check the Netlify **deploy preview** first (previews don't consume paid credits), especially to exercise the payment flow.
- After a push to `main`, Netlify takes ~30s to publish; Cloudflare caches in front of it, so verify changes in incognito after purging the Cloudflare cache.
- `AUDIT.md` (in Spanish) is the operator's living maintenance checklist — pre-commit checks, weekly/monthly/quarterly audits, and a procedure for "each new sales season" (new departure date, new prices). Consult it before touching pricing, dates, or the payment widget; update it if you add a recurring task.
- No `robots`/staging environment split: `_headers` sets `noindex` on `/dossier/*` and `/thanks.html`; `_redirects` maps `/journal` → `/journal/index.html`.

## Site structure

| Path | Purpose |
|---|---|
| `index.html` | Main landing page, bilingual (EN/ES toggle). All marketing sections (tour, route, itinerary, included, guide, POIs, pricing, kit, testimonials, FAQ, journal teaser, lead-capture form). |
| `reservar.html` | Booking/payment page. Self-contained — does **not** load `assets/js/site.js`; all its JS (payment widget + PayPal SDK) is inline in the file. |
| `privacy.html` | Privacy policy (Colombian Ley 1581 data-protection compliance). |
| `thanks.html` | Post-form-submission landing page (`noindex`), also used as the PayPal payment success redirect (`?payment=confirmed`) and dossier-download page. |
| `journal/` | Editorial blog for SEO (`journal/index.html` index + one article per post). Journal pages ship their **own inline `<style>` block** duplicating the CSS custom properties from `assets/css/styles.css` rather than linking the shared stylesheet — a known duplication, keep both in sync when changing the palette/type scale. |
| `dossier/` | PDF route dossier asset, `noindex`'d via `_headers`. |
| `assets/css/styles.css` | Shared stylesheet for `index.html`, `reservar.html`, `privacy.html`, `thanks.html`. |
| `assets/js/site.js` | Shared JS: i18n toggle, nav/burger menu, scroll-reveal animations, stat counters, FAQ accordion, hero photo carousel. Loaded by `index.html` only (other pages inline what they need or don't need it). |
| `assets/img/` | Curated photography. Filename prefixes indicate section: `hero-*`, `hero-band-*`, `stage-*` (route stages), `poi-*` (points of interest), `stay-*` (hotels), `culture-*`, `journal-*`, `stat-*`. |
| `sitemap.xml`, `robots.txt` | SEO — update `sitemap.xml` `<lastmod>` whenever page content changes materially. |

## i18n pattern (index.html only)

`index.html` is the only bilingual page, using a runtime toggle, not build-time generation:
- English is the copy hard-coded in the HTML. On load, `site.js` captures it into an `EN` object by reading every `[data-i18n]` element's `innerHTML` keyed by its `data-i18n` attribute.
- A parallel `ES` dictionary is hand-maintained at the top of `site.js` with the same keys.
- `setLang()` swaps `innerHTML` per key and persists the choice to `localStorage` (`rta-lang`).
- **When adding new translatable copy**: add `data-i18n="some_key"` to the element in `index.html` (English is the source of truth for that element), then add the matching `some_key` entry to the `ES` object in `site.js`. Missing keys silently fall back to whatever HTML is already there.
- Other pages (`reservar.html`, `journal/`, `privacy.html`, `thanks.html`) are **not** wired into this toggle — they mix English primary copy with inline Spanish translations (e.g. "Balance due September 17, 2026 · Saldo restante: ...") directly in the markup instead.

## Payment widget (reservar.html)

The PayPal checkout logic lives **only** inline in `reservar.html` — there is an explicit comment in `site.js` noting it must not be duplicated there. Key points when touching it:
- Config block `RTA_PAY` at the top of the inline script has two flags that gate real money:
  - `USE_LIVE`: `true` uses the live PayPal Client ID (real charges), `false` uses sandbox.
  - `TEST_MODE`: `true` forces **every** button to charge $1.00 USD regardless of package/deposit selection, for live-mode smoke testing. Must be turned off (`false`) before advertising real bookings, and `USE_LIVE`/Client ID must be verified correct before any campaign launch (see `AUDIT.md`'s seasonal checklist).
- Pricing (`PRICES`, `SINGLE_SUPPLEMENT`, `DEPOSIT`) and the `DEPOSIT_CUTOFF` date are hard-coded constants in this script. The deposit option auto-disables past `DEPOSIT_CUTOFF`, falling back to full payment.
- On successful capture, `notifyTeam()` POSTs order details to Netlify's form-handling endpoint (`/`) as `form-name: payment-notification`, matching the hidden `<form name="payment-notification" data-netlify="true" hidden>` declared later in the same file — this is how Netlify learns to route notification emails for a payment that never submits a real HTML form.
- The main lead-capture form on `index.html` is a separate Netlify form, `name="inquiry"`, with a honeypot field (`netlify-honeypot="bot-field"`) and `action="/thanks.html"`.

## Hardcoded dates & prices (update together each sales season)

Several values are duplicated across files and must be changed in lockstep when a new departure/pricing season opens (see `AUDIT.md` → "Cada cambio de temporada de ventas"):
- Departure/date copy in the `ES` dictionary and English HTML in `index.html`.
- `PRICES`, `DEPOSIT`, `DEPOSIT_CUTOFF`, and the balance-due date text in `reservar.html`.
- The `price` field in the `TravelAgency`/`Offer` JSON-LD schema block in `index.html`'s `<head>`.
- `sitemap.xml` `<lastmod>` values for touched pages.

## SEO/head conventions

Every page carries: Plausible analytics snippet, `<meta name="description">`, `<link rel="canonical">` pointing at the absolute `ridetheandes.co` URL, and full Open Graph tags (`og:title`, `og:description`, `og:url`, `og:image` as an **absolute** URL to `assets/img/og-image.jpg`, plus explicit width/height and `twitter:card`). `index.html` additionally carries `TravelAgency` and `FAQPage` JSON-LD schema blocks — keep these in sync with visible copy (price, FAQ text) when either changes. New pages should follow the same `<head>` pattern; `AUDIT.md` calls this out explicitly as a pre-commit check.

## Design system (assets/css/styles.css)

Color palette and type scale are defined as CSS custom properties on `:root` — `--paramo` (deep green, primary), `--terracota`/`--terracota-bright` (accent), `--niebla`/`--niebla-soft`/`--card` (cream backgrounds), `--tierra` (clay), `--lago` (blue), `--asfalto`/`--ink` (near-black text). Fonts: `--serif` (Playfair Display, headings), `--garamond` (Cormorant Garamond, body), `--mono` (IBM Plex Mono, labels/nav/eyebrows, uppercase with wide letter-spacing). Reuse these variables rather than hard-coding colors/fonts. Remember `journal/*.html` duplicates this palette in its own inline `<style>` instead of importing the file.

## Image guidelines (from AUDIT.md)

Compress new images before committing: max width ≈1400px for large hero/section blocks, ≈900px for card-sized images, JPEG quality ~75.
