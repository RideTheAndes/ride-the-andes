# SEO / Performance / Accessibility Audit — ridetheandes.co

**Date:** 2026-08-03
**Scope:** Full repository — every `.html` file, `assets/css/styles.css`, `assets/js/site.js`, `robots.txt`, `sitemap.xml`, `_headers`, `_redirects`, and every image actually referenced by the site — inspected directly, not assumed. Findings below are backed by things checked in this repo: grep cross-references for broken/unused assets, a JPEG-header parser for real image dimensions/weights, a WCAG contrast-ratio calculator run against the actual CSS custom properties, and a JSON-LD parser run against every structured-data block before and after edits.

This audit produced four fix PRs (one per category, as requested) plus this report:

| PR | Category | Link |
|---|---|---|
| 1 | Technical SEO | `claude/seo-technical-fixes` → PR #6 |
| 2 | Structured data | `claude/structured-data` → PR #7 |
| 3 | Accessibility | `claude/accessibility-fixes` → PR #8 |
| 4 | Performance | `claude/performance-fixes` → PR #9 |

Nothing was pushed to `main`. No visible marketing copy, pricing, or dates were changed anywhere. No payment logic in `reservar.html` was touched — only additive attributes (see PR #8). Per `AUDIT.md`, any of these should still go through a Netlify deploy preview before merging, especially PR #8 which touches `reservar.html`.

---

## 1. Technical SEO

| # | Finding | Priority | Impact | Effort | Status |
|---|---|---|---|---|---|
| 1.1 | `privacy.html` had no `<meta description>`, no `<link rel="canonical">`, no Open Graph tags — the only indexable page missing all three | High | Google picks an arbitrary snippet for search results and social shares render blank | Low | **Fixed** (PR #6) |
| 1.2 | `reservar.html` had no `<h1>` anywhere on the page (only a `<h2>`) | High | Every indexable page should have exactly one H1; weakens topical signal on a conversion-critical page | Low | **Fixed** (PR #6) |
| 1.3 | `sitemap.xml` had no `<lastmod>` on any URL | Medium | Google uses `lastmod` as a freshness/recrawl signal | Low | **Fixed** (PR #6) |
| 1.4 | `/index.html` and `/journal/index.html` are reachable at both their clean path and their literal filename, with no redirect consolidating them (canonical tags already existed, but the redirect layer didn't match) | Low | Minor duplicate-URL/link-equity dilution | Low | **Fixed** (PR #6) |
| 1.5 | No custom 404 page — Netlify's default was served for any broken link | Medium | Poor UX and a dead end for crawlers/users landing on stale links | Low | **Fixed** (PR #6, `404.html`) |
| 1.6 | `privacy.html` had two `<h1>` elements (one Spanish, one English) | Medium | Confuses document outline for both SEO and screen readers | Low | **Fixed** (PR #8 — grouped with accessibility since it's fundamentally a heading-hierarchy defect) |
| 1.7 | **No hreflang / no real per-language URLs.** `index.html`'s Spanish content exists only as a JS object (`ES` in `site.js`) that overwrites the DOM after a click; the server never delivers Spanish HTML at any distinct URL. | **Critical** | Ride The Andes is effectively invisible to Spanish-language Google searches (e.g. "cicloturismo Boyacá", "tours en bicicleta Colombia") on its main landing page — a serious gap given the Gran Fondo Boyacá Mundial itself draws ~2,000 mostly-Colombian riders | High | **Not implemented — see §6** |
| 1.8 | No dedicated Terms & Cancellation page; cancellation terms live only inside one FAQ answer | Medium | Weakens trust signals for a page handling real payments; also a missed page/keyword opportunity | Medium (needs legal copy, not fabricated here) | Recommendation only |
| 1.9 | No image sitemap extension (`<image:image>`) despite the site being highly visual/tourism-oriented | Low | Missed low-cost Google Images discovery channel | Low | Recommendation only |
| 1.10 | Internal linking: no broken internal anchors or links found; `robots.txt`/`_headers` noindex rules are consistent and correctly layered (`/thanks.html`, `/dossier/*`) | — | Confirmed healthy, no action needed | — | No issue |
| 1.11 | No crawl traps: the 5 "Coming soon" journal cards on `journal/index.html` are plain `<div>`s, not links — confirmed no thin/duplicate pages get created by them | — | Confirmed healthy | — | No issue |

## 2. On-Page SEO

| # | Finding | Priority | Impact | Effort | Status |
|---|---|---|---|---|---|
| 2.1 | Nearly every "image" on the site is a CSS `background-image` on a `<div>`, not an `<img>` — Google Images generally does not index CSS background images | **High** | The site's strongest asset (curated Boyacá/cycling photography) earns essentially zero Google Images traffic, a real channel for "Colombia cycling tour" / "Boyacá" visual search intent | High (structural — see §6) | Partially mitigated: added `aria-label`s (PR #8) so content is at least described to AT/crawlers reading the DOM; full fix needs real `<img>` tags — see §6 |
| 2.2 | Heading hierarchy otherwise clean — one H1 per page everywhere else, consistent H2→H3 nesting, semantic `<article>`/`<figure>`/`<figcaption>` used correctly for stages, hotels, and testimonials | — | Confirmed healthy | — | No issue |
| 2.3 | Meta description lengths all within the ~150–160 char sweet spot except `privacy.html` (missing, fixed) and `thanks.html`/`404.html` (intentionally `noindex`, low priority) | Low | — | — | Fixed where it mattered |
| 2.4 | Title tags are already reasonably keyword-rich (location + product terms) across all pages; no rewrite attempted since these are marketing copy, not purely technical fields | Low | — | — | Recommendation only — see §6 |

## 3. International SEO

This is the single highest-impact finding of the audit — see **§1.7** above and the dedicated recommendation in **§6**. Summary: the EN/ES toggle is a client-side `innerHTML` swap with no separate URL per language, so **no valid `hreflang` markup can be added today** — `hreflang` requires each language variant to live at its own indexable URL, and adding it pointing at the same URL twice would be actively incorrect per Google's guidelines. We did not add fake `hreflang` tags. German scalability inherits the same problem: bolting on a third `DE` dictionary to the existing toggle would just make three languages invisible to search instead of one.

## 4. Structured Data (PR #7)

| # | Change | Priority | Status |
|---|---|---|---|
| 4.1 | Added `WebSite` schema | Medium | **Done** |
| 4.2 | Enriched `TravelAgency`: `image`, `telephone`, `priceRange`, `sameAs` (Instagram + WhatsApp, both already public on the page) | Medium | **Done** |
| 4.3 | Replaced the placeholder `itinerary: {numberOfItems: 6}` with real `itemListElement` entries for all six stages | Medium | **Done** |
| 4.4 | Added a `SportsEvent` block for the Gran Fondo Boyacá Mundial 2026, using only facts already stated in visible copy — deliberately no `organizer`/`offers`, since Ride The Andes doesn't run that event | Medium | **Done** |
| 4.5 | Added `BreadcrumbList` to both journal pages | Low | **Done** |
| 4.6 | **Deliberately not added:** `aggregateRating`/`Review` on the `TravelAgency` entity. The testimonials on `index.html` are reviews of the Gran Fondo Boyacá Mundial event, not of Ride The Andes tours — marking them up as reviews of the business would be misleading structured data and risks a Google manual action for review-markup abuse | — | Correctly withheld |
| 4.7 | `publisher.logo` on the `BlogPosting` schema — Google's Article guidelines want a logo `ImageObject`, but there's no dedicated square/rectangular logo file in the repo (only an inline SVG brandmark and a 1200×630 landscape `og-image.jpg`, which is the wrong aspect ratio to pass off as a logo) | Low | Recommendation only — see §6 |

All JSON-LD blocks were parsed and validated before committing; recommend also running them through Google's Rich Results Test on the deploy preview.

## 5. Performance (PR #9)

| # | Finding | Priority | Impact | Effort | Status |
|---|---|---|---|---|---|
| 5.1 | `<meta charset>` came after a `<script>` block on every page (should be the first element in `<head>`) | Medium | Can force a browser encoding re-parse; flagged by Lighthouse best-practices | Low | **Fixed** |
| 5.2 | Google Fonts stylesheet loaded fully render-blocking on every page | Medium | Delays first paint | Low | **Fixed** — switched to preload + `media="print"` swap + `noscript` fallback |
| 5.3 | 19 below-the-fold section/card background photos on `index.html` were all fetched eagerly on load regardless of scroll position (CSS `background-image` has no native lazy-loading) | **High** | Meaningful wasted bandwidth and network contention on initial load, worst on mobile | Medium | **Fixed** — deferred via `IntersectionObserver` + `data-bg`, ~200px pre-load margin. **Trade-off, disclosed:** this is JS-dependent, like the rest of the site's interactive behavior; no-JS visitors see the existing gradient placeholder instead of the photo, not a broken layout |
| 5.4 | Four actually-referenced images were far heavier than the site's own `AUDIT.md` guideline (≤1400px width, JPEG q75) | High | Real, verified page-weight bloat | Low | **Fixed** — recompressed: `journal-vida-rural-cantina-leche.jpg` 1.3MB→382KB, `journal-123-hero-sergio-diego.jpg` 727KB→412KB, `journal-123-busbanza-aerea.jpg` 608KB→338KB, `hero-tour-ascenso-gameza.jpg` 530KB→284KB. ~1.75MB saved across these four alone; spot-checked visually, no perceptible quality loss |
| 5.5 | 22 image files in `assets/img/` (`stat-*`, most `culture-*`, `poi-etapafinal-*`, `hero-1..4-*` legacy variants, etc.) are **not referenced by any HTML page** — confirmed by cross-referencing every filename against every page's markup | Low | Zero performance impact (never fetched by visitors) — pure repo hygiene | Low | Not touched; recommend archiving or deleting if truly unused, since they add ~15MB to repo size for no runtime benefit |
| 5.6 | Font files: each page requests more font-weight variants than may actually be used in that page's CSS (e.g. `index.html` requests 8 Playfair Display weights/styles) | Medium | Extra font payload | Medium — requires exhaustively cross-referencing every `font-weight` used per page against its requested weight list; got it wrong once already changes visible type rendering, so this needs to be done with visual verification, not blind | Recommendation only |
| 5.7 | Single shared stylesheet (~24KB), loaded normally render-blocking; RideWithGPS iframe already `loading="lazy"`; the hero LCP image already has `fetchpriority="high"` + explicit `width`/`height` (no CLS risk) | — | Already reasonably optimized | — | No issue — confirmed, not a finding |

## 6. Accessibility (PR #8)

| # | Finding | Priority | Status |
|---|---|---|---|
| 6.1 | FAQ accordion and the EN/ES language toggle were mouse/touch-only (`click`-only listeners on non-form `<div>`s, no `tabindex`, no keyboard handling) | **High** | **Fixed** — `role="button"`, `tabindex="0"`, `aria-expanded`, Enter/Space keydown handlers |
| 6.2 | Burger menu button didn't expose open/closed state to assistive tech | Medium | **Fixed** — `aria-expanded`/`aria-controls` on `index.html` and `reservar.html` |
| 6.3 | ~19 content-bearing background-image divs (POI cards, stage cards, hotel photos, journal teasers, dossier cover) had no `role="img"`/`aria-label` — completely invisible to screen readers | **High** | **Fixed** |
| 6.4 | No skip-link on any page with the fixed header/nav pattern | Medium | **Fixed** — added to `index.html`, `reservar.html`, both journal pages |
| 6.5 | Netlify honeypot field was a real, focusable, unlabeled-for-AT input sitting in the tab order | Medium | **Fixed** — `aria-hidden` on wrapper, `tabindex="-1"` + `autocomplete="off"` on the input |
| 6.6 | Payment total (`reservar.html`) updates dynamically with no `aria-live` region | Medium | **Fixed** |
| 6.7 | `privacy.html`: duplicate `<h1>`, and `<html lang="es">` asserting the whole bilingual document was Spanish when half of it is English | Medium | **Fixed** — see §1.6 |
| 6.8 | `thanks.html`: inline Spanish paragraph not marked `lang="es"` | Low | **Fixed** |
| 6.9 | `--terracota` (#C1622A) is 3.52:1 against the site's cream backgrounds — below the 4.5:1 WCAG AA minimum — for the small mono-labeled text it's used as (`.eyebrow`, `.stage .rlink`, `.price-card .dates`), computed with a standard relative-luminance contrast formula against the actual hex values in `styles.css` | **High** | **Fixed** — new `--terracota-text` variable (hue-preserved, ~15% darker, 4.6–5.1:1), applied only to those three text-color declarations. Every border/background/button use of `--terracota`, including the brand's CTA buttons, is untouched |
| 6.10 | `--tierra` (#8B6914) is also borderline (4.31:1 on `--niebla`, but 4.79:1 on `--card`) across ~18 small-label usages, some on light backgrounds and at least one (`.field label`) apparently on a dark section background | Medium | **Not changed** — the usage contexts are mixed enough (some light, some possibly dark) that a global variable change risks making a currently-fine dark-background instance worse without visual verification in a real browser. Flagged for a manual pass with Lighthouse/axe on the deploy preview rather than guessed at |
| 6.11 | Color contrast elsewhere (`--ink-soft` 5.90:1, `--paramo` 10.74:1, dark-section labels 5.16–9.95:1) computed and confirmed compliant | — | No issue |

---

## Prioritized Action Plan (remaining work, in priority order)

1. **Critical — Real Spanish (and future German) URLs with `hreflang`.** The single biggest opportunity found. Recommended approach: generate `/es/index.html` (and eventually `/de/index.html`) as real static pages using the translated copy that already exists in `site.js`'s `ES` object — it just needs to be server-rendered instead of JS-swapped — plus reciprocal `hreflang="en"`/`hreflang="es"`/`hreflang="x-default"` tags on both versions and a sitemap update. This is a genuine content/architecture project, not a one-line fix, and should go through the same Netlify-preview review as any `index.html` change. Estimated effort: 1–2 days including QA.
2. **High — Convert key background-image divs to real `<img>` tags** for Google Images discoverability (hero, POI cards, stage cards at minimum). Needs careful CSS work per component (the current `::before` gradient/overlay layering assumes a `<div>`, not an `<img>`) and visual QA in a real browser before shipping — did not attempt blind in this pass to honor "preserve exact visual design."
3. **Medium — Font-weight audit.** Cross-reference every `font-weight` actually used in each page's CSS against the weights requested from Google Fonts, and trim the unused ones per page. Needs visual verification, not a blind trim.
4. **Medium — Terms & Cancellation page.** Currently only exists as one FAQ answer; a dedicated page would strengthen trust signals on a payment-taking site and is a real keyword opportunity. Needs legal copy from the business, not fabricated here.
5. **Medium — Create a dedicated square/rectangular logo asset** (`logo.png` or similar) so `BlogPosting.publisher.logo` and future `Organization.logo` can be added correctly — today only an inline SVG brandmark and a 1200×630 landscape OG image exist, neither of which is the right shape for a schema "logo."
6. **Medium — `--tierra` contrast pass**, done visually in a real browser rather than by formula alone given its mixed light/dark usage contexts (§6.10).
7. **Low — Image sitemap** (`<image:image>` entries) for the photography-heavy pages.
8. **Low — Repo hygiene**: 22 unreferenced images (~15MB) sitting in `assets/img/` with no page pointing to them. Confirm with the operator whether they're reserved for planned journal posts before deleting.
9. **Content opportunity — prioritize the two already-planned Journal posts** that have the clearest search intent and lowest competition: *"Cycling at Altitude in Colombia: How to Acclimatise"* and *"Is It Safe to Cycle in Colombia? An Honest Local Answer"* (both already listed as "Coming soon" on `journal/index.html`). These map directly to real traveler-intent queries (altitude, safety) that aren't yet answered anywhere on the site outside of a couple of FAQ lines. A few additional FAQ/content gaps worth considering, to be verified by the operator before publishing (none of these facts are asserted here as true — they're topic suggestions, not answers): Colombian visa requirements for the traveler's likely source countries, airline bike-transport policies, and currency/tipping norms.

## Lighthouse Expectations

No Lighthouse run was performed in this session (no browser/Lighthouse tooling available here, and the site is only meaningfully testable against its live Netlify deploy preview per `AUDIT.md`'s own process — run it there before merging). Based on the concrete changes made, the directional expectation is:

- **Performance**: modest-to-moderate improvement on `index.html` specifically, driven by the 19 deferred background images (less network contention during initial load) and the four recompressed images (~1.75MB less to fetch across the pages that use them). The font-loading change should shave a small amount off First Contentful Paint. LCP was likely already reasonable (the hero image already had `fetchpriority="high"` and explicit dimensions) and is not expected to move much.
- **Accessibility**: should move up multiple points — missing accessible names on ~19 elements and two non-keyboard-operable interactive components (FAQ, language toggle) are exactly the class of issue Lighthouse's axe-core audit flags directly.
- **Best Practices**: the charset-ordering fix addresses a specific, named Lighthouse best-practices check.
- **SEO**: the missing H1 (`reservar.html`), missing meta/canonical/OG (`privacy.html`), and the now-present structured data should register as improvements in Lighthouse's SEO category, though Lighthouse's SEO score is a narrow technical checklist — it won't reflect the bigger international-SEO or Google Images findings above.

Recommend running Lighthouse (mobile) on `index.html` and `reservar.html` against both the current production site and each PR's deploy preview to get real before/after numbers, per `AUDIT.md`'s quarterly-audit item.

## Estimated SEO Impact (6–12 months)

Framed as directional expectations grounded in known Google ranking-factor correlations, not guarantees:

- **0–3 months**: Structured data (PR #7) and technical fixes (PR #6) are typically reflected in Search Console fairly quickly after recrawl — expect FAQ/breadcrumb rich-result eligibility to show up, and `privacy.html` to start appearing correctly in search snippets instead of an auto-generated one.
- **3–6 months**: Accessibility and performance improvements (PRs #8, #9) tend to show up as gradual Core Web Vitals and engagement improvements rather than a step change, which Google's helpful-content and page-experience signals reward slowly over time.
- **6–12 months**: the highest-leverage item by far is the international SEO fix (§6, item 1) — if implemented, it opens the entire Spanish-language search market for Boyacá/Colombia cycling tourism that the site currently cannot rank for at all, which is plausibly a larger opportunity than everything else in this report combined, given the business's own customer base (Colombian Gran Fondo riders) skews Spanish-speaking. The Journal content expansion (item 9) is the second-highest-leverage item, since long-tail informational queries ("cycling at altitude," "is it safe to cycle in Colombia") are exactly where a small operator can realistically outrank larger competitors.

None of the above should be read as a promised ranking position or traffic number — actual results depend on competitive dynamics, Google algorithm changes, and execution quality of the recommendations that weren't auto-implemented here.
