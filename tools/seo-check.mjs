#!/usr/bin/env node
/**
 * seo-check.mjs — validador SEO/head para ridetheandes.co
 *
 * Sin dependencias. Se corre con `node tools/seo-check.mjs` desde la raíz del repo.
 * Automatiza los chequeos que AUDIT.md pedía hacer a mano antes de cada commit
 * ("Qué automatizar" #1) y añade los que alimentan Google Search Console.
 *
 *   node tools/seo-check.mjs            → falla (exit 1) si hay ERRORES
 *   node tools/seo-check.mjs --strict   → falla también con AVISOS
 *   node tools/seo-check.mjs --quiet    → solo imprime problemas
 *
 * Un ERROR es algo que Search Console va a reportar como defecto (canonical roto,
 * página huérfana del sitemap, JSON-LD inválido). Un AVISO es algo que degrada
 * posiciones sin romper nada (título largo, imagen sin comprimir, alt vacío).
 */

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const SITE = 'https://ridetheandes.co';
const ROOT = process.cwd();
const args = process.argv.slice(2);
const STRICT = args.includes('--strict');
const QUIET = args.includes('--quiet');

// Reglas de peso/tamaño de imagen — vienen de AUDIT.md ("Peso").
const IMG_MAX_WIDTH_LARGE = 1400;   // bloques hero/sección
const IMG_MAX_BYTES = 400 * 1024;   // por archivo
const INDEX_IMG_BUDGET_MB = 3.0;    // suma de imágenes que carga index.html

// Anchos del srcset. Un archivo con hermanos -750/-900/-1200 es la cima
// deliberada de una escalera, no un descuido: el cap de ancho no le aplica.
const LADDER_WIDTHS = [750, 900, 1200];

// Páginas que NO deben indexarse ni aparecer en el sitemap.
//   thanks.html → destino de formulario y de pago (noindex en _headers y en <meta>)
//   404.html    → la sirve Netlify como respuesta de error; no tiene canonical
//                 propia ni OG a propósito, y no debe estar en el sitemap.
const NOINDEX = new Set(['thanks.html', '404.html']);

let errors = 0, warns = 0;
const log = [];
function err(scope, msg)  { errors++; log.push(['ERROR', scope, msg]); }
function warn(scope, msg) { warns++;  log.push(['AVISO', scope, msg]); }
function ok(scope, msg)   { if (!QUIET) log.push(['ok', scope, msg]); }

// ---------- utilidades ----------

/** Ruta de archivo → URL canónica esperada. `journal/index.html` → `/journal/`. */
function canonicalFor(file) {
  const p = file.split(sep).join('/');
  if (p === 'index.html') return `${SITE}/`;
  if (p.endsWith('/index.html')) return `${SITE}/${p.slice(0, -'index.html'.length)}`;
  return `${SITE}/${p}`;
}

function htmlPages() {
  const out = [];
  (function walk(dir) {
    for (const name of readdirSync(dir)) {
      if (name.startsWith('.') || name === 'node_modules' || name === 'tools') continue;
      const full = join(dir, name);
      if (statSync(full).isDirectory()) walk(full);
      else if (name.endsWith('.html')) out.push(relative(ROOT, full));
    }
  })(ROOT);
  return out.sort();
}

function stripComments(html) {
  return html.replace(/<!--[\s\S]*?-->/g, ' ');
}

/** Quita <script>/<style>/comentarios para que los chequeos de texto no lean código. */
function visibleText(html) {
  return stripComments(html)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ');
}

/** Extrae un atributo respetando la comilla de apertura: si no, un apóstrofo
 *  dentro del texto ("Colombia's") corta el valor a la mitad. */
function attr(tag, name) {
  return tag?.match(new RegExp(`${name}=(["'])([\\s\\S]*?)\\1`, 'i'))?.[2] ?? null;
}

function meta(html, key, value) {
  const re = new RegExp(`<meta[^>]*${key}=["']${value}["'][^>]*>`, 'i');
  const tag = html.match(re)?.[0];
  return tag ? (attr(tag, 'content') ?? '') : null;
}

/** Lee dimensiones de un JPEG leyendo el marcador SOF. Sin dependencias. */
function jpegSize(path) {
  const b = readFileSync(path);
  if (b[0] !== 0xff || b[1] !== 0xd8) return null;
  let i = 2;
  while (i < b.length - 9) {
    if (b[i] !== 0xff) { i++; continue; }
    const m = b[i + 1];
    if ([0xc0,0xc1,0xc2,0xc3,0xc5,0xc6,0xc7,0xc9,0xca,0xcb,0xcd,0xce,0xcf].includes(m)) {
      return { w: b.readUInt16BE(i + 7), h: b.readUInt16BE(i + 5) };
    }
    if (m === 0xd8 || m === 0xd9 || (m >= 0xd0 && m <= 0xd7)) { i += 2; continue; }
    i += 2 + b.readUInt16BE(i + 2);
  }
  return null;
}

// ---------- chequeos por página ----------

function checkPage(file) {
  const raw = readFileSync(join(ROOT, file), 'utf8');
  const html = stripComments(raw);   // los comentarios no son marcado real
  const isNoindex = NOINDEX.has(file.split(sep).join('/'));
  const scope = file;

  // --- lang ---
  const lang = attr(html.match(/<html[^>]*>/i)?.[0], 'lang');
  if (!lang) err(scope, 'falta <html lang="…"> — Google no sabe en qué idioma está');

  // --- title ---
  const title = html.match(/<title>([\s\S]*?)<\/title>/i)?.[1]?.trim();
  if (!title) err(scope, 'falta <title>');
  else if (title.length > 65) warn(scope, `<title> de ${title.length} chars — Google trunca cerca de 60`);
  else if (title.length < 15) warn(scope, `<title> de solo ${title.length} chars — desaprovechado`);

  // --- description ---
  const desc = meta(html, 'name', 'description');
  if (!desc && !isNoindex) err(scope, 'falta <meta name="description">');
  else if (desc && desc.length > 160) warn(scope, `description de ${desc.length} chars — se corta en ~155`);
  else if (desc && desc.length < 70) warn(scope, `description de solo ${desc.length} chars — corta para el snippet`);

  // --- canonical ---
  const canonical = attr(html.match(/<link[^>]*rel=["']canonical["'][^>]*>/i)?.[0], 'href');
  if (!canonical) {
    if (!isNoindex) err(scope, 'falta <link rel="canonical">');
  } else {
    const want = canonicalFor(file);
    if (!canonical.startsWith('https://')) err(scope, `canonical no es absoluta: ${canonical}`);
    else if (!canonical.startsWith(SITE)) err(scope, `canonical apunta a otro dominio: ${canonical}`);
    else if (canonical !== want) err(scope, `canonical ${canonical} debería ser ${want}`);
  }

  // --- noindex ---
  const robots = meta(html, 'name', 'robots') ?? '';
  if (isNoindex && !/noindex/i.test(robots)) {
    err(scope, 'debería llevar <meta name="robots" content="noindex"> (no confiar solo en _headers)');
  }
  if (!isNoindex && /noindex/i.test(robots)) {
    err(scope, 'tiene noindex pero es una página pública — se caería del índice');
  }

  // --- Open Graph ---
  if (!isNoindex) {
    for (const p of ['og:title', 'og:description', 'og:url', 'og:image']) {
      if (meta(html, 'property', p) === null) err(scope, `falta <meta property="${p}">`);
    }
    const ogImg = meta(html, 'property', 'og:image');
    if (ogImg && !ogImg.startsWith('https://')) {
      err(scope, `og:image debe ser URL absoluta (WhatsApp/LinkedIn no resuelven relativas): ${ogImg}`);
    }
    if (ogImg?.startsWith(SITE)) {
      const rel = ogImg.slice(SITE.length + 1);
      if (!existsSync(join(ROOT, rel))) err(scope, `og:image apunta a un archivo que no existe: ${rel}`);
    }
    const ogUrl = meta(html, 'property', 'og:url');
    if (ogUrl && canonical && ogUrl !== canonical) {
      warn(scope, `og:url (${ogUrl}) no coincide con canonical (${canonical})`);
    }
    if (meta(html, 'name', 'twitter:card') === null) warn(scope, 'falta twitter:card');
  }

  // --- encabezados ---
  // Sobre el HTML sin comentarios: index.html documenta la decisión del alt del
  // hero y la palabra "<h1>" aparece literal dentro de ese comentario.
  const h1s = html.match(/<h1[\s>]/gi) ?? [];
  if (!isNoindex) {
    if (h1s.length === 0) err(scope, 'no tiene <h1> — Google no encuentra el tema principal');
    else if (h1s.length > 1) warn(scope, `${h1s.length} <h1> en la página — debería ser uno solo`);
  }

  // --- JSON-LD ---
  const blocks = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi) ?? [];
  blocks.forEach((b, i) => {
    const body = b.replace(/^<script[^>]*>/i, '').replace(/<\/script>$/i, '');
    try {
      const data = JSON.parse(body);
      if (!data['@type']) warn(scope, `JSON-LD #${i + 1} sin @type`);
    } catch (e) {
      err(scope, `JSON-LD #${i + 1} no parsea (Google lo descarta entero): ${e.message}`);
    }
  });

  // --- imágenes ---
  for (const tag of html.match(/<img[^>]*>/gi) ?? []) {
    const src = attr(tag, 'src') ?? '(sin src)';
    if (!/\balt=/i.test(tag)) err(scope, `<img> sin alt: ${src}`);
    else if (/alt=(["'])\1/.test(tag) && !/aria-hidden|role=["']presentation["']/i.test(tag)) {
      warn(scope, `<img> con alt vacío — invisible para Google Images: ${src}`);
    }
    if (!/\bwidth=/i.test(tag) || !/\bheight=/i.test(tag)) {
      warn(scope, `<img> sin width/height — provoca layout shift (CLS): ${src}`);
    }
  }

  // Fotos puestas como background CSS: no las indexa Google Images.
  const bg = (html.match(/background-image:\s*url\(['"]?assets\/img\//gi) ?? []).length;
  if (bg > 0) {
    warn(scope, `${bg} fotos como background-image CSS — invisibles para Google Images y sin alt`);
  }

  // --- restos de borrador ---
  const text = visibleText(raw);
  for (const needle of ['PLACEHOLDER', 'TODO', '[pending]', 'Lorem ipsum']) {
    if (text.includes(needle)) err(scope, `texto de borrador visible en producción: "${needle}"`);
  }

  // --- hreflang recíproco ---
  const hreflangs = html.match(/<link[^>]*rel=["']alternate["'][^>]*hreflang=["']([^"']+)["'][^>]*>/gi) ?? [];
  if (hreflangs.length && !hreflangs.some(h => /hreflang=["']x-default["']/i.test(h))) {
    warn(scope, 'hay hreflang pero falta x-default');
  }

  return { file, canonical, isNoindex, title, lang, hreflangCount: hreflangs.length };
}

// ---------- sitemap ----------

function checkSitemap(pages) {
  const scope = 'sitemap.xml';
  if (!existsSync(join(ROOT, 'sitemap.xml'))) { err(scope, 'no existe'); return; }
  const xml = readFileSync(join(ROOT, 'sitemap.xml'), 'utf8');

  const entries = [...xml.matchAll(/<url>([\s\S]*?)<\/url>/gi)].map(m => ({
    loc: m[1].match(/<loc>([^<]+)<\/loc>/i)?.[1]?.trim(),
    lastmod: m[1].match(/<lastmod>([^<]+)<\/lastmod>/i)?.[1]?.trim(),
  }));
  if (!entries.length) { err(scope, 'no tiene entradas <url>'); return; }

  const locs = new Set(entries.map(e => e.loc));
  const today = new Date().toISOString().slice(0, 10);

  for (const e of entries) {
    if (!e.loc) { err(scope, 'entrada <url> sin <loc>'); continue; }
    if (!e.loc.startsWith(SITE)) err(scope, `<loc> fuera del dominio: ${e.loc}`);
    if (!e.lastmod) {
      err(scope, `${e.loc} sin <lastmod> — es la señal que Google usa para re-rastrear`);
    } else if (!/^\d{4}-\d{2}-\d{2}$/.test(e.lastmod)) {
      err(scope, `<lastmod> con formato inválido en ${e.loc}: ${e.lastmod}`);
    } else if (e.lastmod > today) {
      err(scope, `<lastmod> en el futuro en ${e.loc}: ${e.lastmod}`);
    }
  }

  // Toda página indexable tiene que estar; ninguna noindex puede estar.
  for (const p of pages) {
    const want = canonicalFor(p.file);
    if (p.isNoindex) {
      if (locs.has(want)) err(scope, `${p.file} es noindex pero está en el sitemap — señal contradictoria`);
    } else if (!locs.has(want)) {
      err(scope, `falta ${want} (${p.file}) — Google puede no descubrirla nunca`);
    }
  }

  // Google ignora changefreq y priority desde 2023: ruido que confunde al operador.
  if (/<changefreq>|<priority>/i.test(xml)) {
    warn(scope, 'usa <changefreq>/<priority> — Google los ignora, mejor quitarlos y confiar en <lastmod>');
  }
  if (entries.every(e => e.lastmod)) ok(scope, `${entries.length} URLs, todas con lastmod`);
}

// ---------- robots.txt ----------

/** Parsea _headers en bloques { path, directives[] }. */
function parseHeaders() {
  const p = join(ROOT, '_headers');
  if (!existsSync(p)) return [];
  const blocks = [];
  let cur = null;
  for (const line of readFileSync(p, 'utf8').split('\n')) {
    if (/^\s*(#|$)/.test(line)) continue;
    if (/^\S/.test(line)) { cur = { path: line.trim(), directives: [] }; blocks.push(cur); }
    else if (cur) cur.directives.push(line.trim());
  }
  return blocks;
}

function checkRobots() {
  const scope = 'robots.txt';
  if (!existsSync(join(ROOT, 'robots.txt'))) { err(scope, 'no existe'); return; }
  const txt = readFileSync(join(ROOT, 'robots.txt'), 'utf8');

  const sm = txt.match(/^\s*Sitemap:\s*(\S+)/im)?.[1];
  if (!sm) err(scope, 'falta la línea "Sitemap:" — Search Console la usa para autodescubrir');
  else if (sm !== `${SITE}/sitemap.xml`) err(scope, `Sitemap: apunta a ${sm}, debería ser ${SITE}/sitemap.xml`);

  // Trampa clásica: Disallow + noindex se anulan entre sí. Si Google no puede
  // rastrear la URL, nunca lee el noindex, y la puede indexar igual sin snippet.
  // Se compara contra el BLOQUE concreto de _headers, no contra el archivo entero:
  // _headers ya tiene varios bloques y un substring suelto daría falsos positivos.
  const blocks = parseHeaders();
  for (const m of txt.matchAll(/^\s*Disallow:\s*(\S+)/gim)) {
    const path = m[1];
    if (path === '/') continue;
    const norm = (s) => s.replace(/\*$/, '');
    const hit = blocks.find(b => {
      const bp = norm(b.path), dp = norm(path);
      return (bp.startsWith(dp) || dp.startsWith(bp))
        && b.directives.some(d => /^X-Robots-Tag:.*noindex/i.test(d));
    });
    if (hit) {
      err(scope, `"Disallow: ${path}" bloquea el rastreo, así que Google nunca ve el "${hit.directives.find(d => /X-Robots-Tag/i.test(d))}" del bloque ${hit.path} en _headers — deja solo el noindex`);
    }
  }
  if (!errors) ok(scope, 'sitemap declarado, sin conflicto Disallow/noindex');
}

// ---------- imágenes: escalera srcset, huérfanas y presupuesto ----------

function imageReport() {
  const scope = 'assets/img';
  const dir = join(ROOT, 'assets/img');
  if (!existsSync(dir)) return;

  const files = readdirSync(dir).filter(f => /\.(jpe?g|png)$/i.test(f));
  const sizeOf = Object.fromEntries(files.map(f => [f, statSync(join(dir, f)).size]));
  const stem = (f) => f.replace(/\.(jpe?g|png)$/i, '');
  const ladderBase = (f) => stem(f).replace(new RegExp(`-(${LADDER_WIDTHS.join('|')})$`), '');

  // Un archivo es cima de escalera si existe algún hermano -750/-900/-1200.
  const isLadderTop = (f) =>
    LADDER_WIDTHS.some(w => files.some(o => stem(o) === `${stem(f)}-${w}`));
  const isLadderRung = (f) => ladderBase(f) !== stem(f);

  // Texto de todo el código, para resolver referencias.
  const code = [];
  (function walk(d) {
    for (const n of readdirSync(d)) {
      if (n.startsWith('.') || n === 'node_modules') continue;
      const full = join(d, n);
      if (statSync(full).isDirectory()) walk(full);
      else if (/\.(html|css|js|mjs)$/.test(n)) code.push(full);
    }
  })(ROOT);
  const blob = code.map(f => readFileSync(f, 'utf8')).join('\n');

  // Una imagen cuenta como referenciada si aparece su nombre, su nombre sin
  // extensión (index.html usa data-imgs="hero-band-2-lago-tota") o —si es un
  // peldaño— la base de su escalera (site.js concatena el sufijo en runtime).
  const referenced = (f) =>
    blob.includes(f) || blob.includes(stem(f)) ||
    (isLadderRung(f) && blob.includes(ladderBase(f)));

  const orphans = files.filter(f => !referenced(f));
  const live = files.filter(f => referenced(f));

  // Fuera de norma, pero SOLO entre las que de verdad se cargan: una huérfana
  // pesada no cuesta nada al visitante, es lastre del repo. Son problemas
  // distintos y mezclarlos hace que el informe no se pueda accionar.
  let heavy = 0;
  for (const f of live) {
    const bytes = sizeOf[f];
    const dims = /\.jpe?g$/i.test(f) ? jpegSize(join(dir, f)) : null;
    const tooWide = dims && dims.w > IMG_MAX_WIDTH_LARGE && !isLadderTop(f);
    const tooBig = bytes > IMG_MAX_BYTES;
    if (tooWide || tooBig) {
      heavy++;
      const parts = [];
      if (tooWide) parts.push(`${dims.w}px de ancho (máx ${IMG_MAX_WIDTH_LARGE})`);
      if (tooBig) parts.push(`${Math.round(bytes / 1024)} KB (máx ${IMG_MAX_BYTES / 1024})`);
      warn(scope, `${f}: ${parts.join(', ')}`);
    }
  }
  if (!heavy) ok(scope, `${live.length} imágenes en uso, todas dentro de norma`);

  if (orphans.length) {
    const mb = orphans.reduce((s, f) => s + sizeOf[f], 0) / 1048576;
    const total = files.reduce((s, f) => s + sizeOf[f], 0) / 1048576;
    warn(scope, `${orphans.length} imágenes huérfanas (no las referencia ningún html/css/js): ${mb.toFixed(1)} MB de ${total.toFixed(1)} MB. No afectan al visitante, sí al peso del repo`);
  }

  // Presupuesto por página. Con srcset el navegador baja UN peldaño, no la
  // escalera entera: contar todos los peldaños inflaría la cifra. Se cuenta el
  // mayor de cada escalera, que es el peor caso real (desktop).
  for (const page of htmlPages()) {
    const html = readFileSync(join(ROOT, page), 'utf8');
    const used = files.filter(f => html.includes(f) || html.includes(stem(f)) ||
      (isLadderRung(f) && html.includes(ladderBase(f))));
    if (!used.length) continue;
    const groups = {};
    for (const f of used) {
      const g = ladderBase(f);
      groups[g] = Math.max(groups[g] ?? 0, sizeOf[f]);
    }
    const mb = Object.values(groups).reduce((a, b) => a + b, 0) / 1048576;
    if (page === 'index.html' && mb > INDEX_IMG_BUDGET_MB) {
      warn(scope, `index.html carga ${mb.toFixed(1)} MB en imágenes (presupuesto ${INDEX_IMG_BUDGET_MB} MB) — LCP en móvil`);
    } else if (mb > INDEX_IMG_BUDGET_MB) {
      warn(scope, `${page} carga ${mb.toFixed(1)} MB en imágenes — revisar`);
    }
  }
}

// ---------- coherencia precio / FAQ vs JSON-LD ----------
// CLAUDE.md: "keep these in sync with visible copy (price, FAQ text)".
// Un desajuste aquí es motivo de acción manual en Search Console.

function checkStructuredDataSync() {
  const scope = 'index.html · JSON-LD';
  const file = join(ROOT, 'index.html');
  if (!existsSync(file)) return;
  const html = readFileSync(file, 'utf8');
  const text = visibleText(html);

  for (const b of html.match(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi) ?? []) {
    let data;
    try { data = JSON.parse(b.replace(/^<script[^>]*>/i, '').replace(/<\/script>$/i, '')); }
    catch { continue; }

    // Precio declarado debe aparecer en la página (con o sin separador de miles).
    const price = data?.makesOffer?.price ?? data?.offers?.price;
    if (price) {
      const n = String(price).replace(/[^\d]/g, '');
      const withSep = n.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
      if (!text.includes(n) && !text.includes(withSep)) {
        err(scope, `el precio ${price} del schema no aparece en el texto visible — Google marca desajuste de datos estructurados`);
      } else {
        ok(scope, `precio ${price} coherente con la copia visible`);
      }
    }

    // Cada pregunta del FAQPage debe existir, literal, en la página.
    if (data['@type'] === 'FAQPage') {
      const qs = data.mainEntity ?? [];
      let matched = 0;
      for (const q of qs) {
        const name = q?.name;
        if (!name) continue;
        if (text.includes(name)) matched++;
        else err(scope, `la pregunta del FAQ schema no coincide con el HTML visible: "${name}"`);
      }
      if (matched === qs.length) ok(scope, `${qs.length} preguntas del FAQPage coinciden con la página`);
    }
  }
}

// ---------- verificación de Search Console ----------

function checkSearchConsole() {
  const scope = 'Search Console';
  const html = existsSync(join(ROOT, 'index.html')) ? readFileSync(join(ROOT, 'index.html'), 'utf8') : '';
  const hasMeta = /google-site-verification/i.test(html);
  const hasFile = readdirSync(ROOT).some(f => /^google[0-9a-f]+\.html$/i.test(f));
  if (!hasMeta && !hasFile) {
    warn(scope, 'no hay verificación en el repo — si es por DNS TXT en Cloudflare está bien, pero tiene que quedar anotada en CLAUDE.md § Search Console para que un cambio de DNS no la tumbe en silencio');
  } else {
    ok(scope, hasMeta ? 'verificada por meta tag' : 'verificada por archivo HTML');
  }
}

// ---------- ejecución ----------

const files = htmlPages();
const pages = files.map(checkPage);
checkSitemap(pages);
checkRobots();
imageReport();
checkStructuredDataSync();
checkSearchConsole();

// Idiomas indexables: base del argumento hreflang.
const langs = new Set(pages.filter(p => !p.isNoindex).map(p => p.lang));
if (langs.size > 1 && !pages.some(p => p.hreflangCount > 0)) {
  warn('hreflang', `hay páginas en ${[...langs].join(' y ')} sin ningún <link rel="alternate" hreflang> — Google no sabe que son versiones del mismo sitio`);
}

const PAD = { ERROR: '\x1b[31mERROR\x1b[0m', AVISO: '\x1b[33mAVISO\x1b[0m', ok: '\x1b[32m  ok \x1b[0m' };
let lastScope = null;
for (const [level, scope, msg] of log) {
  if (scope !== lastScope) { console.log(`\n\x1b[1m${scope}\x1b[0m`); lastScope = scope; }
  console.log(`  ${PAD[level]}  ${msg}`);
}

console.log(`\n${'─'.repeat(64)}`);
console.log(`${files.length} páginas revisadas · \x1b[31m${errors} errores\x1b[0m · \x1b[33m${warns} avisos\x1b[0m`);

if (errors > 0) {
  console.log('Corrige los ERRORES antes de hacer merge a main.\n');
  process.exit(1);
}
if (STRICT && warns > 0) {
  console.log('--strict: los avisos también fallan.\n');
  process.exit(1);
}
console.log('Sin errores bloqueantes.\n');
