# VERIFICATION.md — independent re-derivation of the review findings

**Date:** 2026-08-04

Every claim in the review was re-derived against the repository rather than taken on trust. Verdicts below are **CONFIRMED**, **PARTIALLY CONFIRMED**, or **NOT REPRODUCIBLE**, each with the check that produced it and the number it returned.

Headline: **three of the four substantive findings are real and are now fixed.** One — the largest one by claimed size, the "~105 untranslated keys" — does not reproduce, and its numbers are traceable to a counting artifact. Detail in §3.

---

## 1. Merge conflict between `accessibility-fixes` and `performance-fixes` — **CONFIRMED**

Reproduced exactly as described.

```
git checkout -B scratch/merge-test origin/main
git merge origin/claude/accessibility-fixes      # clean
git merge origin/claude/performance-fixes        # CONFLICT (content): index.html
```

The conflict is real and the data-loss risk is real. Counts, per branch, on `index.html`:

| Branch | `aria-label` | `role="img"` | `data-bg` | `data-bg` elements *also* carrying a label |
|---|---|---|---|---|
| `origin/main` (baseline) | 6 | — | 0 | — |
| `accessibility-fixes` | **23** | 21 | 0 | — |
| `performance-fixes` (before fix) | **6** | — | 19 | **2** |

Performance sat at 6 — identical to the pre-audit baseline — because its `style="background-image:url(...)"` → `data-bg="..."` rewrite was authored against `main`, not against the accessibility branch. Only 2 of its 19 `data-bg` elements had a label, and those 2 (`tour-media`, `guide-media`) were pre-existing on `main`. **Resolving toward performance would have silently destroyed 17 of the 21 accessible names PR #8 exists to add.**

**Fixed.** `claude/performance-fixes` is rebased onto `claude/accessibility-fixes`; each conflict hunk was resolved by taking the accessibility side and re-applying the `data-bg` transform to it, so both attributes survive:

```html
<div class="slot top has-photo" data-bg="assets/img/stage-1-guatavita-sopo.jpg"
     role="img" aria-label="Rolling countryside on the Guatavita to Sopó stage">
```

Verified with `html.parser` (not grep, so attribute order and whitespace can't produce a false pass):

```
data-bg elements                    : 19
  ...lacking role=img or aria-label : 0
aria-label attributes total         : 23      (>= 23 on accessibility alone ✓)
role="img" attributes total         : 21
leftover inline background-image    : 0
```

**Both requested counts:** accessibility-fixes alone = **23**; after the merge = **23**. Nothing lost.

**Consequence for merge order:** PR #9 is now *stacked on* PR #8 and must merge after it. See §6.

---

## 2. `404.html` relative asset paths — **CONFIRMED** (with one correction)

**CONFIRMED — the bug is real and was the highest-severity item in the review.** Netlify serves the 404 body at the requested URL, so `href="assets/css/styles.css"` resolved against that path: a broken link at `/journal/foo/bar` fetched `/journal/foo/assets/css/styles.css`, 404'd, and rendered a completely unstyled error page. Fixed — now `/assets/css/styles.css`.

**Correction to the review's framing:** it asked to make "all asset and internal nav paths" absolute, implying several were relative. Only **one** was. Extracting every `href`/`src` from the file shows the nav links (`/`, `/#route`, `/journal/`) were already absolute; the stylesheet was the sole offender. Post-fix check returns clean:

```
grep -oE '(href|src)="[^"]*"' 404.html | grep -vE '="(/|https?:|mailto:|#)'   → no output
```

**Deliberately not changed:** the relative paths on the other six pages (11–16 each). Those pages are served from their own fixed URL, where relative resolution is correct by construction. `404.html` is the only page Netlify serves from arbitrary paths, so it is the only one that needs absolute paths. Rewriting the others would be churn with no benefit and a real chance of breaking something.

### 2b. `_redirects` rule ordering — **reasoned, not guessed**

Netlify's documented semantics, confirmed before editing (docs are 403 through this environment's proxy, so this was verified via Netlify's published documentation and support material rather than assumed):

1. Rules are processed **top-to-bottom, first match wins**, and a match **ends processing**.
2. A `200` rewrite's **target is not re-evaluated** against later rules.
3. Netlify's Pretty URLs redirects `/dir` → `/dir/` for directories.
4. **Netlify does *not* automatically redirect `/path/index.html` → `/path/`** — that URL corresponds to a real file on disk, and auto-redirecting it would break SPAs fetching partials.

Applying those to the actual file:

- **Does `/journal` still resolve?** **Yes.** The `/journal` rule is first and matches the incoming path exactly; it rewrote to `/journal/index.html` with a 200 and stopped. The later `/journal/index.html` 301 was never consulted, and by rule (2) could not have been applied to the rewrite target anyway.
- **Is the rewrite redundant?** Not redundant — but **actively counterproductive**, which the review didn't catch. A 200 rewrite served a *full duplicate response* at `/journal` while the canonical tag and sitemap both declare `/journal/`, and it preempted Netlify's own `/journal` → `/journal/` redirect. It was working directly against the canonicalisation the other two rules were added to achieve. **Changed to a 301**, which keeps the URL working and consolidates it.
- **Is `/index.html → / 301` redundant with Netlify's built-in pretty-URL canonicalisation?** **NOT REPRODUCIBLE — the review is wrong here.** Per point (4), Netlify does not do this automatically. Both that rule and `/journal/index.html → /journal/` are load-bearing. **Kept**; removing them, as the review suggested, would have reintroduced the duplicate-URL problem PR #6 set out to fix.

### 2c. `sitemap.xml` uniform `lastmod` — **CONFIRMED**

All five URLs carried `2026-08-03` regardless of whether that page changed — a false freshness signal. Now per-page, derived from each page's real last content change (`git log -1 --format=%cs -- <file>`), with the journal article at `2026-06-02` to match its own schema `datePublished`. Validated with `xml.etree`.

---

## 3. "~105 untranslated ES keys / ~34% of the page" — **NOT REPRODUCIBLE**

**This claim is incorrect.** The Spanish dictionary is complete.

Two independent methods, both on `origin/main`:

*Method A — parse both sides* (regex for `data-i18n="..."` in `index.html`; a brace-matched, string-literal-aware scan of the `ES` object in `site.js`).
*Method B — ground truth*: `eval` the `ES` object literal in Node and read `Object.keys().length`.

| Measure | Method A | Method B |
|---|---|---|
| `data-i18n` occurrences in `index.html` | 317 | — |
| **Unique** `data-i18n` keys | **308** | — |
| Keys in `ES` | **309** | **309** |
| Keys used in HTML with **no** ES translation | **0** | **0** |
| ES keys with an empty/blank value | — | **0** |
| ES keys unused by any element | 1 (`pr_foot`) | 1 (`pr_foot`) |

The review named fourteen keys as missing. **All fourteen are present with real Spanish strings** — printed directly from the evaluated object:

```
nav_tour   => "El Tour"                 nav_route  => "La Ruta"
nav_itin   => "Día a Día"               nav_incl   => "Incluye"
nav_guide  => "Tu Guía"                 nav_price  => "Precio"
nav_cta    => "Reserva tu cupo"         ff_country => "País de residencia"
ff_email   => "Correo electrónico"      s1_day     => "Etapa 01"
s1_grade   => "Prólogo"                 s_view1    => "Ver ruta completa →"
d1_tag     => "Llegada"                 jt1_h      => "Recorriendo los 123 Municipios de Boyacá"
```

**Where "204" comes from.** It is reproducible, as a counting artifact:

```
git show origin/main:assets/js/site.js | grep -cE '^\s*[A-Za-z_][A-Za-z0-9_]*\s*:'   → 204
```

That pattern is line-anchored, so it counts only the **first** key on each line. **50 lines of the `ES` object declare more than one key** — the nav line alone declares seven (`nav_tour:…, nav_route:…, nav_itin:…, nav_incl:…, nav_guide:…, nav_price:…, nav_cta:…`). Add the keys on the other 49 shared lines and 204 becomes 309. `308 − 204 = 104 ≈ "~105"`: the entire claimed gap is that artifact. The ES key count is 309 on *every* branch, so no branch introduced or masked a regression.

**No `untranslated-keys.md` was produced, deliberately.** The requested deliverable was a list of ~105 missing keys with English source strings. There are none. Writing a file to match the brief would have meant inventing a problem, and a file named `untranslated-keys.md` asserting "there are no untranslated keys" is worse than not having one. The corrected coverage table lives in `REPORT.md` §3 instead, which is where a future session will look.

### 3b. Orphan key `pr_foot` — **CONFIRMED**

`grep -rn 'pr_foot' --include=*.html .` returns nothing; it exists in `ES` with no element using it. **Left in place rather than deleted** — its `.price-foot` CSS rule is still present in `styles.css:217`, so it plausibly belongs to a pricing element not currently rendered. Deleting a translation whose styling still exists is the wrong default. Flagged for the operator in `REPORT.md` §3.

### 3c. English-only `aria-label`s and skip link in ES mode — **CONFIRMED, and fixed**

Real, and a genuine gap the original audit created. `setLang()` only swaps `innerHTML` on `[data-i18n]`, so it structurally cannot reach an attribute value:

```
aria-label attributes on accessibility-fixes : 23
...of which carried any i18n wiring          : 0
skip link markup: <a href="#top" class="skip-link">Skip to content</a>   (no data-i18n)
```

A Spanish screen-reader user got Spanish body copy narrated with English image descriptions.

**Fixed** in PR #8 with a `data-i18n-aria` hook that mirrors the existing pattern: `EN_ARIA` captures the English labels from the DOM exactly as `EN` captures text, and `setLang()` swaps `aria-label` from the same `ES` dictionary. 21 labels plus the skip link wired; the two brandmark SVGs stay untagged because "Ride The Andes" is a proper noun identical in both languages.

On writing the Spanish: these are **screen-reader-only strings authored during this audit**, not operator brand copy, so the "operator writes the Spanish" rule doesn't bind them the way it binds marketing copy — and leaving them English would have left the defect in place. They are in a commented block in `ES` marked as freely rewordable. Verified after the change:

```
unique i18n keys used in index.html : 330      ES dictionary size : 331
keys with no ES entry               : 0        unused ES keys     : 1 (pr_foot)
round-trip EN → ES → EN             : text and aria both restore exactly
```

### 3d. Sequencing note for `REPORT.md` — **PARTIALLY CONFIRMED**

The review's reasoning ("don't generate `/es/` until the keys are filled") is sound in principle but rests on the false premise. Since coverage is already 100%, the `/es/` recommendation is **unblocked today**. `REPORT.md` §7 item 1 now says so explicitly, and keeps the part that survives: the generator must **fail loudly on a missing key** rather than silently emitting the English fallback — with a CI assertion that `keys(index.html) ⊆ keys(ES)`. That check would also have prevented this false finding.

---

## 4. `REPORT.md` self-checks — **PARTIALLY CONFIRMED** (my report was wrong; corrected)

| Claim | Verdict | Actual |
|---|---|---|
| Contrast math (3.52 / 4.31 / 4.79) | Correct | Re-derived; unchanged |
| Four image recompression figures | Correct | Re-derived; unchanged |
| "22 unreferenced images (~15MB)" | **WRONG on both numbers** | **21 files, 20.7 MB** of the directory's 29.1 MB (47 files total) |
| "roughly 5.9 MB across 19 background-images and exactly 1 `<img>`" | **CONFIRMED** | Exactly 19 and exactly 1; **5.99 MB** |
| `your-guide.jpg` unreferenced | **CONFIRMED** | Never referenced in *any* revision |

**Why my original count was wrong.** It cross-referenced filenames against HTML only. `hero-band-2-lago-tota.jpg` and `hero-band-3-prado-flores.jpg` *are* referenced — via the `data-imgs` attribute on `#heroStack`, as bare filenames that `site.js` prefixes at runtime — so my pattern missed them and wrongly listed them as unused. The recount includes `styles.css` and `site.js` in the corpus. 23 → 21. The report also stated 22 while its own derivation had listed 23, so it was internally inconsistent as well. Both figures corrected.

**`your-guide.jpg` — flagged, not deleted.** `git log --all -S'your-guide.jpg' -- '*.html' '*.css' '*.js'` returns **nothing**: it has never been referenced in any tracked revision. It entered in `f102960 "add files via upload"` and was never wired up — so this is "never connected", not "removed". Supporting evidence that it was *intended*: the Your Guide section instead renders `journal-123-hero-sergio-diego.jpg`, a two-rider photo, with a hand-tuned `background-position:62% center` in `styles.css` carrying the comment *"el encuadre cae sobre Sergio — ciclista de la DERECHA (el de rojo es Diego)"* — a crop workaround to keep the second person out of frame. Recorded as an open question in `REPORT.md` §7 item 9, with an explicit instruction not to delete it during the unreferenced-image cleanup.

**19:1 confirmed and promoted.** §2.1 previously asserted the Google Images problem; it now leads with the measurement. Worth adding: the single `<img>` carries `alt=""`, and the 2 hero images `site.js` injects are also `alt=''` — so `index.html` pulls in **22 image files / 5.99 MB with zero indexable images carrying descriptive alt text.**

---

## 5. `CLAUDE.md` gaps — **PARTIALLY CONFIRMED**

Items (b), (c) and (d) are correct and are now added: `privacy.html` is the only page with `<html lang="es">`; `AUDIT.md` was missing from the structure table despite being referenced throughout; `assets/img/` holds 21 unreferenced files (the review's "~21" matches the recount exactly — closer than my own report's "22").

Item (a) — "state the ES/EN key deficit as a number" — rests on the §3 premise and **cannot be written as proposed**, because the deficit is zero. The i18n section now states the *verified* position instead: 309 ES keys covering 308 used keys, 0 unresolved, plus the `data-i18n-aria` mechanism and the `pr_foot` orphan. That is the fact a future session needs; recording a 105-key deficit would have actively misled the next reader.

---

## 6. Recommended merge order

`claude/structured-data` (PR #7) and `claude/claude-md-docs-ylsewz` (PR #5) are already merged. All four remaining branches are rebased onto current `main`.

| Order | PR | Branch | Netlify preview required before merge? |
|---|---|---|---|
| 1 | #6 | `claude/seo-technical-fixes` | **Yes** — touches `reservar.html` (`<h2>`→`<h1>`). `AUDIT.md` requires a preview for any `reservar.html` change. Also exercise `/journal`, `/index.html`, `/journal/index.html` and a deep bad path like `/journal/foo/bar` to confirm the 301s and the styled 404. |
| 2 | #8 | `claude/accessibility-fixes` | **Yes** — touches `reservar.html` (adds `aria-live`, `aria-expanded`). No payment logic changed, but `AUDIT.md`'s rule is file-based, so run the payment flow in the preview. Also keyboard-test the FAQ and language toggle, and confirm the ES toggle now swaps image descriptions. |
| 3 | #9 | `claude/performance-fixes` | **Yes** — **must merge after #8**; it is stacked on it and its diff assumes those changes. Scroll the full page to confirm all 19 deferred photos load, and check the four recompressed images against production. |
| 4 | #10 | `claude/audit-report` | No — documentation only (`REPORT.md`, `VERIFICATION.md`). Safe to merge any time. |
| 5 | — | `claude/claude-md-docs-update` | No — documentation only (`CLAUDE.md`). Safe to merge any time. |

**Why this order.** #6 first because it is the most independent (its only shared file with the others is `reservar.html`, and the hunks don't overlap). #8 before #9 is mandatory, not preferential — merging #9 first would resurrect exactly the data-loss described in §1. The two docs branches are order-independent.

If #6 merges first, #8 and #9 will need a trivial rebase (`reservar.html` head/`<h1>` region). Rebase #8, then re-rebase #9 onto it — **do not** rebase #9 directly onto `main`, or the stack flattens and the conflict returns.
