# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

The marketing/booking website for Ride The Andes S.A.S., a boutique cycling tour operator in Boyacá, Colombia (ridetheandes.co). It is a **static site with no build system, no package manager, and no framework** — plain HTML/CSS/vanilla JS deployed as-is. There is nothing to `npm install`, build, lint, or test; editing the HTML/CSS/JS files directly *is* the development workflow.

## Deploy & workflow

- Hosted on Netlify, connected to GitHub. Every `git push` to `main` deploys automatically — there is no CI/build step.
- Before merging any change to `reservar.html` or `assets/js/site.js`, push to a branch and check the Netlify **deploy preview** first (previews don't consume paid credits), especially to exercise the payment flow.
- After a push to `main`, Netlify takes ~30s to publish; Cloudflare caches in front of it, so verify changes in incognito after purging the Cloudflare cache.
- `AUDIT.md` (in Spanish) is the operator's living maintenance checklist — pre-commit checks, weekly/monthly/quarterly audits, and a procedure for "each new sales season" (new departure date, new prices). Consult it before touching pricing, dates, or the payment widget; update it if you add a recurring task.
- No `robots`/staging environment split: `_headers` sets `noindex` on `/dossier/*` and `/thanks.html`. `_redirects` 301s `/index.html` → `/`, `/journal/index.html` → `/journal/`, and `/journal` → `/journal/`. Those first two are load-bearing: **Netlify does not canonicalise `/path/index.html` → `/path/` on its own**, because that URL maps to a real file on disk. Rules are first-match-wins top-to-bottom and a matched rule ends processing, so order matters if you add wildcards.
- `404.html` is served by Netlify **at the requested URL**, not at `/404.html`. Every `href`/`src` in it must stay absolute (`/assets/...`) — a relative path resolves against the broken URL and yields an unstyled page at any nested path. This constraint applies to `404.html` only; the other pages are served from fixed URLs where relative paths are correct.

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
| `assets/img/` | Curated photography. Filename prefixes indicate section: `hero-*`, `hero-band-*`, `stage-*` (route stages), `poi-*` (points of interest), `stay-*` (hotels), `culture-*`, `journal-*`, `stat-*`. **Roughly 21 of the 47 files here are referenced by nothing** (`stat-*`, most `culture-*`, `poi-etapafinal-*`, the `hero-1..4-*` legacy variants, `your-guide.jpg`) — ~20.7 MB of the 29.1 MB total. They are not dead weight for visitors (never fetched), and they are **not an invitation to wire them into pages**; assume they are unused on purpose unless the operator says otherwise. Note `hero-band-2/3` *are* used, via the `data-imgs` attribute on `#heroStack` as bare filenames — check `site.js` and `styles.css`, not just HTML, before calling an image unused. |
| `AUDIT.md` | **Repo root.** The operator's living maintenance checklist (Spanish): pre-commit checks, weekly/monthly/quarterly audits, and a per-sales-season procedure. Referenced throughout this file — read it before touching pricing, dates, images, or the payment widget. |
| `sitemap.xml`, `robots.txt` | SEO — update `sitemap.xml` `<lastmod>` whenever page content changes materially. |

## i18n pattern (index.html only)

`index.html` is the only bilingual page, using a runtime toggle, not build-time generation:
- English is the copy hard-coded in the HTML. On load, `site.js` captures it into an `EN` object by reading every `[data-i18n]` element's `innerHTML` keyed by its `data-i18n` attribute.
- A parallel `ES` dictionary is hand-maintained at the top of `site.js` with the same keys.
- `setLang()` swaps `innerHTML` per key and persists the choice to `localStorage` (`rta-lang`).
- Accessible names use a parallel `data-i18n-aria` hook: `EN_ARIA` captures English `aria-label` values from the DOM the same way `EN` captures text, and `setLang()` swaps the attribute from the same `ES` dictionary. Needed because `setLang()`'s text path only touches `innerHTML` and structurally cannot reach an attribute value.
- **When adding new translatable copy**: add `data-i18n="some_key"` to the element in `index.html` (English is the source of truth for that element), then add the matching `some_key` entry to the `ES` object in `site.js`. For an `aria-label`, use `data-i18n-aria="some_key"` instead. Missing keys fall back silently to whatever is already in the markup — so a typo'd key looks like working English rather than an error.

**Translation coverage is currently complete — keep it that way.** As of 2026-08-04: **331 keys in `ES`, covering all 330 `data-i18n` + `data-i18n-aria` keys used in `index.html`, with 0 unresolved.** Do not assume there is a backlog of untranslated copy; there isn't, and a previous review wrongly concluded otherwise by counting ES keys with a line-anchored `grep` (which returns 204, because 50 lines of the object declare more than one key). To count them correctly, `eval` the object literal and read `Object.keys().length`, or parse it with a string-literal-aware scanner. If you add a key, add its Spanish in the same change.

One known orphan: **`pr_foot` exists in `ES` with no element using it.** Leave it — its `.price-foot` rule is still in `styles.css`, so it likely belongs to a pricing element not currently rendered.

- Other pages (`reservar.html`, `journal/`, `privacy.html`, `thanks.html`) are **not** wired into this toggle — they mix English primary copy with inline Spanish translations (e.g. "Balance due September 17, 2026 · Saldo restante: ...") directly in the markup instead.
- **`privacy.html` is the only page with `<html lang="es">`** — every other page is `lang="en"`. Its English half is wrapped in `<div lang="en">` for correct lang-of-parts. Don't "normalise" that attribute without moving the wrapper.

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

## Contrast: never pair `opacity` with a text `color`

**Compute the composited colour before trusting any contrast number.** CSS `opacity`
blends the element into its backdrop *before* WCAG measures contrast, so a token that
passes on its own can fail once an opacity is applied. Five rules on this site failed
WCAG AA exactly this way — `.note`, `.form-note`, `.testi .ts-src`,
`.testi .placeholder-note` and `.pay-strip .pi`, all `var(--tierra)` at `opacity` .5–.85,
landing between 1.97:1 and 3.49:1.

Automated tooling caught only two of them, because it samples what is in the rendered
viewport: rules below the fold, inside collapsed regions, or on elements that no page
currently renders are simply never measured. **A contrast audit here must be a static
sweep of the stylesheet**, not a page scan. Grep for rules declaring both a `color` and
an `opacity`, composite each against its real section background, and check the result.

Two traps that follow from this:
- **Check the real background.** `.form-note` sits inside `.final`, which is a *dark*
  gradient. A darker token would have made it worse; it needed a lighter one (`#cfc9b8`,
  the colour `.final p` already uses).
- **Large text has a different threshold** (3:1, not 4.5:1, at ≥24px or ≥18.66px bold).
  `.price-anchor` is `--ink-soft` at `opacity:.75` → 3.65:1, which *passes* only because
  it renders at 30px. Leave it alone; don't "fix" it into a visual change.

Use `--terracota-text` and `--tierra-text` for small text on the cream backgrounds. Both
are hue-preserved darker variants that clear 4.5:1 on every cream in the palette. Do not
use them on the dark sections, and do not change `--terracota` or `--tierra` themselves —
those are still correct as borders, backgrounds, and on dark backgrounds.

## Image guidelines (from AUDIT.md)

Compress new images before committing: max width ≈1400px for large hero/section blocks, ≈900px for card-sized images, JPEG quality ~75.
