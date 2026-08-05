# VERIFICATION-2.md — composited contrast + hero byte measurements

**Date:** 2026-08-05
**Branches:** `claude/a11y-round-2` (Task 1), `claude/hero-image-verify` (Task 2)

Every figure below was re-derived against the repository. Where the brief's numbers were right, that is stated. Where they were wrong, that is stated too.

---

## 1.1 — Composited contrast sweep

### Why these were missed

CSS `opacity` blends the element into its backdrop **before** WCAG measures contrast. A token that passes on its own can fail once an opacity is applied, and a page-scanning tool only measures what it actually rendered in the viewport — so rules below the fold, in collapsed regions, or on elements no page renders are never sampled. The sweep below is static over the stylesheet, not a page scan.

Compositing formula used: `result = α·foreground + (1−α)·backdrop`, then the standard WCAG relative-luminance ratio.

### The five cited rules — before

| Rule | Line | Declared | Opacity | Real backdrop | Composited | Ratio | Size | Threshold | Verdict |
|---|---|---|---|---|---|---|---|---|---|
| `.note` | 170 | `var(--tierra)` #8B6914 | .85 | `#F7F3E8` `.sec-b` | **#9B7E34** | **3.49:1** | 12px | 4.5:1 | FAIL |
| `.form-note` | 341 | `var(--tierra)` #8B6914 | .85 | **dark `.final` gradient** | #785D12 / #7B6214 / #7C5F13 | **2.85 / 2.13 / 2.58:1** | 12px | 4.5:1 | FAIL |
| `.testi .ts-src` | 467 | `var(--tierra)` #8B6914 | .80 | `#F0ECE0` `.testi` | **#9F833D** | **3.07:1** | 11px | 4.5:1 | FAIL |
| `.testi .placeholder-note` | 236 | `var(--tierra)` #8B6914 | .75 | `#F0ECE0` `.testi` | **#A48A47** | **2.82:1** | 11.2px | 4.5:1 | FAIL (dead CSS) |
| `.pay-strip .pi` | 347 | `var(--tierra)` #8B6914 | .50 | `#F7F3E8` `.sec-b price` | **#C1AE7E** | **1.97:1** | 14px | 4.5:1 | FAIL |

**Four of the five quoted hex/ratio pairs were exactly right** — `.note`, `.testi .ts-src`, `.testi .placeholder-note`, `.pay-strip .pi` reproduced to the byte and to two decimal places.

### Two corrections to the brief

**`.form-note`'s arithmetic is wrong — the conclusion survives, the fix does not.** It is not on a cream background. It sits inside `<section class="final">`, whose background is `linear-gradient(160deg,#0c1c06,#1f3b12 60%,#2a2410)` plus two radial overlays. Composited against the real backdrop it measures **2.13–2.85:1** depending on gradient position — worse than the claimed 3.49:1. Critically, the suggested remedy would have **made it worse**:

| Candidate for `.form-note` | Worst ratio across the gradient | Verdict |
|---|---|---|
| `--tierra-text` #6F5410 *(the suggested darker token)* | **1.74:1** | **FAIL — worse than the bug** |
| `--tierra` #8B6914 with opacity removed | 2.44:1 | FAIL |
| **#cfc9b8** — the colour `.final p` already uses | **7.50:1** | **PASS — adopted** |

**`.testi .placeholder-note` is dead CSS.** `grep -rn 'placeholder-note' --include=*.html .` returns nothing; no page renders it. The 2.82:1 figure is correct but it fails nothing in practice. Fixed anyway, so it cannot become a trap if someone wires it up later.

### A sixth rule the brief missed

The sweep found one more rule pairing a colour with an opacity:

| Rule | Line | Declared | Opacity | Backdrop | Composited | Ratio | Size | Threshold | Verdict |
|---|---|---|---|---|---|---|---|---|---|
| `.price-anchor` | 316 | `var(--ink-soft)` #5B5A4C | .75 | `--card` #FBF8EF | #838275 | 3.65:1 | **30px** | **3:1 (large)** | **PASS** |

Left unchanged. It renders at `1.5rem` = 30px, above the 24px large-text boundary, so 3:1 applies and 3.65:1 clears it. "Fixing" it would have been a visual change for no accessibility gain.

### Rules with `opacity` but no `color`

Only two, both decorative pseudo-elements with no text: `body::after` (.04) and `.slot::before` (.06).

`body::after` is worth noting: it is a fixed, full-viewport paper-grain layer at `z-index:9999` with `mix-blend-mode:multiply`, so it composites over **all** text on the page. Modelled effect:

| Case | Before overlay | After overlay | Δ |
|---|---|---|---|
| dark text on cream | 5.90:1 | 5.85:1 | −0.05 |
| light text on dark | 9.95:1 | 9.33:1 | −0.62 |

It does not move anything from pass to fail on its own, but it eats up to 0.6 of margin on dark sections — a reason to leave headroom rather than target exactly 4.5:1.

### After

New token `--tierra-text:#6F5410` (verified: 6.42:1 on `#F7F3E8`, 6.02:1 on `#F0ECE0`, 6.70:1 on `#FBF8EF`, 5.64:1 on `#EAE5D3` — the brief's two quoted figures were both correct). `--tierra` itself is untouched; it is used in ~18 places, some on dark backgrounds where it already passes.

| Rule | New colour | Backdrop | Ratio | Verdict |
|---|---|---|---|---|
| `.note` | `--tierra-text` | `#F7F3E8` | **6.42:1** | PASS |
| `.form-note` | `#cfc9b8` | `.final` worst stop | **7.50:1** | PASS |
| `.testi .ts-src` | `--tierra-text` | `#F0ECE0` | **6.02:1** | PASS |
| `.testi .placeholder-note` | `--tierra-text` | `#F0ECE0` | **6.02:1** | PASS |
| `.pay-strip .pi` | `--tierra-text` | `#F7F3E8` | **6.42:1** | PASS |

`.form-note` across every gradient stop: 10.72:1 / 7.50:1 / 9.35:1.

Post-fix sweep: one rule still pairs colour with opacity — `.price-anchor`, which passes.

---

## 2.1 / 2.2 — Hero bytes at a 412px viewport

### Establishing the real baseline

The guard removal and the `srcset`/`-900` work landed in the **same** commit (`b0be04f`), so "before" is `b0be04f^`: guard present, **no** `srcset`, `data-imgs="hero-band-2-lago-tota.jpg,hero-band-3-prado-flores.jpg"`. Mobile therefore loaded exactly one image, at full 1800w = **304,397 B (297.3 KB)**.

`sizes="(max-width:1080px) 100vw, 1200px"` → at 412px the slot is 412px; the browser picks the smallest candidate ≥ `412 × DPR`.

### 2.1 — before vs after (as shipped, candidates 900w/1800w)

| DPR | Needed | Picks | BEFORE (guard, no srcset) | AFTER (no guard, srcset) | Δ |
|---:|---:|---:|---:|---:|---|
| 1.0 | 412 | 900w | 297.3 KB | 206.9 KB | −90.4 KB better |
| 1.75 | 721 | 900w | 297.3 KB | 206.9 KB | −90.4 KB better |
| 2.0 | 824 | 900w | 297.3 KB | 206.9 KB | −90.4 KB better |
| **2.625** | 1082 | **1800w** | 297.3 KB | **764.1 KB** | **+466.8 KB WORSE** |
| 3.0 | 1236 | 1800w | 297.3 KB | 764.1 KB | +466.8 KB WORSE |

**The brief's DPR 1.75 case is genuinely better, not worse** — 90.4 KB saved. But the crossover sits at DPR 2.19 (`412 × DPR > 900`), and above it the browser jumps straight to the 1800w candidate for all three frames: **764 KB, a 2.6× regression**. 412px CSS width at DPR 2.625 is an ordinary mid-range Android configuration, so this is not an edge case. The guard is warranted — just not for the reason or at the breakpoint the brief assumed.

### 2.2 — is a ~750w variant worth it?

Measured, all three photos, JPEG q75 (the project's stated convention):

| Ladder | 3-image total | vs current 900w |
|---|---:|---|
| 750w | 153.1 KB | **−53.9 KB (−26%)** |
| 900w *(current)* | 206.9 KB | — |
| 1200w | 379.1 KB | — |
| 1800w *(current)* | 764.1 KB | — |

**Yes — 750w saves 26% at the DPR 1.75 case.** Added. A 1200w rung was added too: it is the larger prize, cutting the high-DPR jump from 764 KB to 379 KB (−50%).

### Resolution shipped

Rotation guard restored to `min-width:1080px` (mobile keeps the first photo, static), **and** the ladder extended to `750w / 900w / 1200w / 1800w`. Mobile then loads exactly one image:

| DPR | Needed | Picks | AFTER + guard | BEFORE | Δ |
|---:|---:|---:|---:|---:|---|
| 1.0 | 412 | 750w | **67.7 KB** | 297.3 KB | −229.6 KB |
| 1.75 | 721 | 750w | **67.7 KB** | 297.3 KB | −229.6 KB |
| 2.0 | 824 | 900w | **89.6 KB** | 297.3 KB | −207.6 KB |
| 2.625 | 1082 | 1200w | **159.0 KB** | 297.3 KB | −138.2 KB |
| 3.0 | 1236 | 1800w | 297.3 KB | 297.3 KB | 0 |

Better at every DPR, never worse. Desktop keeps the rotation and also improves: at ≥1080px the 1200px slot at DPR 1 now picks the 1200w rung — **379.1 KB, down from 768.5 KB**.

Net repo cost: +6 generated files (~632 KB), −1 deleted orphan (222 KB).

### 2.3 — hero `alt` text: kept decorative, with a concrete reason

Inactive frames are hidden with **`opacity:0` only** (`styles.css:531`, `.hf-stack img{…opacity:0}` / `.on{opacity:1}`) — not `display:none`, not `visibility:hidden`. All three images therefore stay in the accessibility tree **simultaneously**. Wiring per-frame `alt` would make a screen reader announce three separate photo descriptions for what is visually one slot, and would do so in DOM order with no relationship to which frame is showing.

The hero's message is already carried in text: the `<h1>` ("Climb where legends are made"), the intro paragraph, and the `hf-chip` caption ("Boyacá, Colombia · The Eastern Cordillera"). Nothing is lost with `alt=""`, which is the correct WCAG treatment for mood imagery. Rationale recorded in both `index.html` and `site.js` so it is not "fixed" later by mistake.

Extending `setLang` to swap `alt` was rejected on the same grounds — it would translate an announcement that should not be made at all.

### 2.4 — orphaned file

`assets/img/hero-band-3-prado-flores.jpg` (222,313 B): `grep -rn 'hero-band-3-prado-flores' --include=*.html --include=*.css --include=*.js .` returns **zero** references. It was superseded when `data-imgs` switched to `hero-band-3-panning`. **Deleted.**

Note the near-miss: `culture-ciclistas-prado-flores.jpg` is a *different* file, still in use by a POI `data-bg` card. A loose `prado-flores` grep hits it. Only the exact `hero-band-3-` prefix is orphaned.

### 2.5 — the 19 `data-bg` photos were not touched.

---

## 1.5 — Regression guard (Task 1)

| Check | Result |
|---|---|
| `[data-bg]` elements | 19 (unchanged from `main`) |
| …missing `role="img"` or a non-empty `aria-label` | **0** |
| `aria-label` count | 23 — identical to `origin/main`, no drop |
| unique `data-i18n` + `data-i18n-aria` keys | 333 |
| `ES` dictionary size | 334 |
| keys with no ES entry | **0** |
| orphan ES keys | 1 (`pr_foot`, pre-existing) |

---

## Other corrections to the brief

**1.2 — the wrapper-safety claim is correct, and I found a live bug behind it.** Confirmed zero `body >` selectors in `styles.css` *and* in all seven inline `<style>` blocks; every structural pseudo-selector (`:last-child`, `:nth-child`) is scoped to an inner container (`.trust .cell`, `.incl .it`, `.faq .q`, `.day`, `.legal .keybox p`), never to a child of `body`. Safe.

Separately: the five newer journal articles already shipped a skip link pointing at `#main`, but **no element with `id="main"` existed on those pages** — the link went nowhere. Adding the landmark fixes it. Where a `<section>` already held `id="main"` (reservar, journal index, the older article) the id was moved onto `<main>` rather than duplicated.

**1.3 — `<h3>` is the wrong level; `<h2>` is required.** Simulating the full heading sequence of both affected pages:

| Footer level | `index.html` | `reservar.html` |
|---|---|---|
| `h4` (current) | skips h2→h4 | skips h1→h4 |
| **`h3`** (suggested) | no skips | **still skips h1→h3** |
| **`h2`** (used) | no skips | no skips |

The brief scoped this to `index.html`, but `reservar.html` carries the same three footer headings after an `<h1>`, so `h3` would have left it broken. `h2` is also the better semantic fit now that the footer is a sibling of `<main>` rather than a subsection of the last content block.

One trap: `<h4>` was never matched by the global `h1,h2,h3` rule, so promoting it would have newly inherited `line-height:1.04` and shifted footer spacing. `line-height:1.6` is pinned explicitly on the retargeted selector. Cascade simulated property-by-property — all eight computed values identical.

**1.4 — chose two real `<button>`s (option b).** Option (a) would satisfy 2.5.3 by padding the aria string with "EN ES", which passes the letter of the rule while leaving the semantics wrong: one `role="button"` cannot express a two-option choice where one is current. Two real buttons give each control an accessible name that *is* its visible text, express state through `aria-pressed`, and get Enter/Space from the platform — so the custom keydown handler was deleted rather than maintained. The container keeps `aria_lang` as a `role="group"` label, so the ES key stays in use rather than becoming an orphan. Button UA styles (`background`/`border`/`font`) reset so rendering is unchanged.

---

## Recommended merge order

| Order | Branch | Netlify preview before merge? |
|---|---|---|
| 1 | `claude/hero-image-verify` | **Yes — behaviour.** On a real phone (or DevTools at 412px with DPR 2.625) confirm the hero shows one static photo and no rotation; on desktop ≥1080px confirm all three still rotate on the 5.2s cycle. Check DevTools Network for which `srcset` rung is actually fetched at each DPR. |
| 2 | `claude/a11y-round-2` | **Yes — behaviour.** Tab to the skip link on each page type and confirm it lands on `<main>`; click and keyboard-activate both EN/ES buttons (Enter *and* Space) and confirm language switches and `aria-pressed` flips; confirm the footer headings and the five recoloured labels look unchanged. Since it touches `reservar.html`, run the payment flow per `AUDIT.md`. |

The two branches are independent — they touch `index.html` and `site.js` in different regions (hero block / carousel IIFE vs. header, footer, and the i18n + FAQ blocks), so either order works mechanically. Hero first is suggested only because it is the smaller diff to eyeball.

Whichever merges first, rebase the other before merging; both edit `assets/js/site.js`.

**Lighthouse scoring belongs against production, after merge** — a deploy preview reports different numbers (no CDN cache warm, different host headers), so preview runs are for *behaviour* verification only, not for scoring the change.
