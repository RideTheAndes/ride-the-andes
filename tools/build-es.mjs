#!/usr/bin/env node
/**
 * build-es.mjs — genera es/index.html (la edición en español) a partir de
 * index.html + el diccionario ES de assets/js/site.js.
 *
 * Sin dependencias. Correr desde la raíz del repo:
 *
 *   node tools/build-es.mjs            → escribe es/index.html
 *   node tools/build-es.mjs --check    → falla (exit 1) si es/index.html no coincide
 *                                        con lo que se generaría ahora (CI usa esto:
 *                                        /es/ nunca puede quedarse atrás en silencio)
 *
 * Guardarraíl no negociable (PLAN-2027 § Fase 1): si a una clave data-i18n le falta
 * su traducción, este script FALLA con la lista de claves — nunca emite el inglés
 * de relleno. Una "página en español" a medias es peor que ninguna.
 *
 * Qué hace, en orden:
 *   1. innerHTML de cada [data-i18n] → ES[clave]; aria-label de cada [data-i18n-aria]
 *   2. quita los atributos data-i18n/-aria (site.js no tiene nada que capturar en /es/)
 *   3. <html lang="es">, head en español (title/description/OG/canonical/og:locale)
 *   4. hreflang recíproco ya viene de index.html; el toggle pasa a marcar ES activo
 *   5. FAQPage JSON-LD regenerado EN ESPAÑOL desde el diccionario (las preguntas del
 *      schema deben coincidir con el texto visible de ESTA página, no con el inglés)
 *   6. rutas relativas → absolutas (/assets/…, /journal/…, /reservar.html, …):
 *      es/index.html vive un nivel más adentro y lo relativo daría 404
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';

const CHECK = process.argv.includes('--check');
const SITE = 'https://ridetheandes.co';

// ---- head en español (editar aquí; el validador vigila las longitudes) ----
const ES_HEAD = {
  title: 'Ride The Andes — Ciclismo Premium en Boyacá, Colombia',
  description: 'Tour guiado premium de 10 días por Boyacá, Colombia — seis etapas desde El Dorado hasta la meta del Gran Fondo Boyacá Mundial. Máximo 10 cupos.',
  ogTitle: 'Ride The Andes — Ciclismo Premium en Boyacá, Colombia',
  ogDescription: 'Diez días desde El Dorado hasta la meta del Gran Fondo Boyacá Mundial. Guiado por el hombre que recorrió los 123 municipios de Boyacá.',
};
// Preguntas del FAQ que van al schema de /es/ (mismas cuatro que la versión EN).
const FAQ_KEYS = [['q1', 'a1'], ['q2', 'a2'], ['q5', 'a5'], ['q6', 'a6']];

function die(msg) { console.error(`build-es: ${msg}`); process.exit(1); }

if (ES_HEAD.title.length > 65) die(`title de ${ES_HEAD.title.length} chars — máx 65`);
if (ES_HEAD.description.length > 160) die(`description de ${ES_HEAD.description.length} chars — máx 160`);

// ---- cargar fuentes ----
const html = readFileSync('index.html', 'utf8');
const js = readFileSync('assets/js/site.js', 'utf8');
const esMatch = js.match(/const ES = \{[\s\S]*?\n\};/);
if (!esMatch) die('no encuentro el objeto ES en assets/js/site.js');
const ES = (0, eval)('(' + esMatch[0].replace('const ES = ', '').replace(/;$/, '') + ')');

// ---- guardarraíl: cobertura completa o nada ----
const used = new Set([...html.matchAll(/data-i18n(?:-aria|-alt|-title)?="([^"]+)"/g)].map(m => m[1]));
const missing = [...used].filter(k => !(k in ES));
if (missing.length) {
  die(`claves sin traducción en ES (${missing.length}) — NO se emite página a medias:\n  ${missing.join('\n  ')}`);
}

let out = html;

// ---- 1. innerHTML de cada [data-i18n] ----
// De atrás hacia adelante para no invalidar índices. El cierre se busca con
// conteo de profundidad del MISMO tag, por si algún elemento anida su tipo.
const opens = [...out.matchAll(/<([a-zA-Z0-9]+)\b[^>]*\bdata-i18n="([^"]+)"[^>]*>/g)];
for (const m of opens.reverse()) {
  const [tagStr, tag, key] = m;
  const innerStart = m.index + tagStr.length;
  const re = new RegExp(`<${tag}\\b[^>]*>|</${tag}>`, 'gi');
  re.lastIndex = innerStart;
  let depth = 1, closeStart = -1, mm;
  while ((mm = re.exec(out))) {
    depth += mm[0][1] === '/' ? -1 : 1;
    if (depth === 0) { closeStart = mm.index; break; }
  }
  if (closeStart < 0) die(`no encuentro </${tag}> para data-i18n="${key}"`);
  out = out.slice(0, innerStart) + ES[key] + out.slice(closeStart);
}

// ---- 2. aria-label de cada [data-i18n-aria] y alt de cada [data-i18n-alt],
//         y fuera los atributos ----
out = out.replace(/<[^>]*\bdata-i18n-aria="([^"]+)"[^>]*>/g, (tag, key) =>
  tag.replace(/aria-label="[^"]*"/, `aria-label="${ES[key]}"`));
out = out.replace(/<img[^>]*\bdata-i18n-alt="([^"]+)"[^>]*>/g, (tag, key) =>
  tag.replace(/alt="[^"]*"/, `alt="${ES[key]}"`));
// title del <iframe>: es su nombre accesible, y no lo alcanza ningún otro hook.
out = out.replace(/<iframe[^>]*\bdata-i18n-title="([^"]+)"[^>]*>/g, (tag, key) =>
  tag.replace(/title="[^"]*"/, `title="${ES[key]}"`));
out = out.replace(/ data-i18n(?:-aria|-alt|-title)?="[^"]*"/g, '');

// ---- 3. lang + head ----
function swap(old, neu, label) {
  if (out.split(old).length !== 2) die(`esperaba exactamente 1 vez en index.html: ${label ?? old}`);
  out = out.replace(old, neu);
}
swap('<html lang="en">', '<html lang="es">');
swap(/<title>[\s\S]*?<\/title>/.exec(out)[0], `<title>${ES_HEAD.title}</title>`, '<title>');
swap(/<meta name="description" content="[^"]*">/.exec(out)[0],
  `<meta name="description" content="${ES_HEAD.description}">`, 'meta description');
swap(`<link rel="canonical" href="${SITE}/">`, `<link rel="canonical" href="${SITE}/es/">`);
swap(/<meta property="og:title" content="[^"]*">/.exec(out)[0],
  `<meta property="og:title" content="${ES_HEAD.ogTitle}">`, 'og:title');
swap(/<meta property="og:description" content="[^"]*">/.exec(out)[0],
  `<meta property="og:description" content="${ES_HEAD.ogDescription}">`, 'og:description');
swap(`<meta property="og:url" content="${SITE}/">`, `<meta property="og:url" content="${SITE}/es/">`);
swap('<meta property="og:locale" content="en_US">', '<meta property="og:locale" content="es_CO">');
swap('<meta property="og:locale:alternate" content="es_CO">', '<meta property="og:locale:alternate" content="en_US">');

// ---- 4. toggle: ES pasa a ser la página actual ----
swap('<a href="/" class="on" aria-current="page" hreflang="en">EN</a><a href="/es/" hreflang="es" lang="es">ES</a>',
     '<a href="/" hreflang="en" lang="en">EN</a><a href="/es/" class="on" aria-current="page" hreflang="es">ES</a>',
     'toggle de idioma');

// ---- 5. FAQPage en español (coincide con el texto visible de /es/) ----
const strip = (s) => s.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
const faqEs = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  inLanguage: 'es',
  mainEntity: FAQ_KEYS.map(([q, a]) => ({
    '@type': 'Question', name: strip(ES[q]),
    acceptedAnswer: { '@type': 'Answer', text: strip(ES[a]) },
  })),
};
const faqBlock = /<script type="application\/ld\+json">\s*\{[\s\S]*?"@type": "FAQPage"[\s\S]*?<\/script>/.exec(out);
if (!faqBlock) die('no encuentro el bloque FAQPage en index.html');
swap(faqBlock[0], `<script type="application/ld+json">\n${JSON.stringify(faqEs, null, 2)}\n</script>`, 'FAQPage');

// ---- 6. rutas relativas → absolutas ----
out = out.replace(/(["(,]\s*)assets\//g, '$1/assets/');
out = out.replace(/href="(reservar\.html|privacy\.html|terminos\.html)/g, 'href="/$1');
out = out.replace(/href="journal\//g, 'href="/journal/');

// ---- sello de archivo generado ----
out = out.replace('<!DOCTYPE html>',
  '<!DOCTYPE html>\n<!-- ══ GENERADO por tools/build-es.mjs desde index.html + diccionario ES (site.js).\n     NO editar a mano: editar la fuente y correr `node tools/build-es.mjs`. ══ -->');

// ---- comprobaciones finales ----
if (/data-i18n/.test(out)) die('quedaron atributos data-i18n en la salida');
if (/(["(,]\s*)assets\//.test(out)) die('quedaron rutas relativas assets/ en la salida');
if ((out.match(/<h1[\s>]/g) ?? []).length !== 1) die('la salida no tiene exactamente un <h1>');
if (!out.includes('Sube donde se forjan')) die('la salida no contiene el h1 en español — algo falló en el reemplazo');
for (const b of out.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) JSON.parse(b[1]);

// ---- escribir o comparar ----
const dest = 'es/index.html';
if (CHECK) {
  if (!existsSync(dest)) die(`${dest} no existe — correr node tools/build-es.mjs y commitearlo`);
  if (readFileSync(dest, 'utf8') !== out) {
    die(`${dest} está DESACTUALIZADO respecto a index.html + diccionario ES — regenerar con node tools/build-es.mjs y commitear`);
  }
  console.log(`build-es: ${dest} al día con index.html y el diccionario ES.`);
} else {
  mkdirSync('es', { recursive: true });
  writeFileSync(dest, out);
  console.log(`build-es: ${dest} generado (${(out.length / 1024).toFixed(0)} KB, ${used.size} claves aplicadas).`);
}
