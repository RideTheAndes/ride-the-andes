# SEO.md — Search Console ↔ repo · ridetheandes.co

*Complementa `AUDIT.md`. Ese archivo dice **cuándo** revisar; este dice **qué mirar en
Search Console y qué archivo del repo tocar** cuando algo aparece mal.*

*Última auditoría técnica: 9 de agosto de 2026, contra `main` en `42a7b3b`.*

---

## 1. El bucle: de Search Console al repo

Search Console no es un tablero para mirar. Es una **cola de defectos**: cada informe
apunta a un archivo concreto de este repo. La regla es que ningún hallazgo se queda en
la pestaña del navegador — o se convierte en un commit, o se anota aquí como aplazado
con fecha.

```
Search Console → hallazgo → archivo del repo → commit → deploy → "Validar corrección" en GSC
```

El último paso se olvida siempre y es el que importa: Search Console **no re-rastrea
solo** cuando arreglas algo. Hay que pedirle validación, o el error sigue contando en la
propiedad durante semanas.

**Antes de cualquier commit a `main`:**

```bash
node tools/seo-check.mjs
```

Falla (exit 1) si hay algo que Search Console reportaría como defecto. Los avisos no
bloquean pero se revisan en la auditoría mensual. `--strict` los vuelve bloqueantes.

### Dónde vive la comprobación — y dónde NO

Corre como job `seo-check` en `.github/workflows/main.yml`, en cada PR y en cada push a
`main`, junto al check de Plausible.

**No es el build command de Netlify, y es una decisión deliberada.** Netlify publica al
hacer push a `main`; hoy no hay build command, así que no hay nada que pueda fallar entre
el push y la publicación. Poner el validador ahí convertiría cualquier falso positivo en
un bloqueo de despliegue — y `reservar.html` está cobrando de verdad desde que se apagó
`TEST_MODE`. El día que haya que sacar un arreglo urgente al flujo de pago, nadie quiere
descubrir que el deploy no sale porque una `description` creció tres caracteres.

Que ese riesgo es real y no teórico ya está demostrado: al portar el validador a `main`
seis de sus comprobaciones daban resultados falsos, sencillamente porque el repo había
evolucionado (`404.html`, la escalera `srcset`, un `<h1>` dentro de un comentario). Se
arreglaron, pero aparecerán más a medida que el sitio cambie. Un check que se equivoca en
un PR cuesta cinco minutos; el mismo check equivocándose delante de un deploy de
emergencia cuesta mucho más.

Como gate de PR el peor caso es un PR en rojo que se revisa y se mergea igual. **Ojo:**
en rojo *avisa*, pero solo **bloquea** de verdad si en GitHub → Settings → Branches se
marca `seo-check` como *required status check*. Sin eso es informativo.

Si algún día el sitio deja de tomar pagos, o el validador acumula meses sin un falso
positivo, se puede reconsiderar. Los strings exactos están en `AUDIT.md`; no aplicarlos
mientras haya cobros vivos.

---

## 2. Verificación de propiedad

**Sin resolver.** No hay verificación de ningún tipo en el repo: ni meta tag ni archivo
`google*.html`. La ficha que hay que rellenar, y qué rompe cada método, está en
**`CLAUDE.md` § "Search Console: ownership verification"**. Es la primera tarea
pendiente de esta lista: sin propiedad verificada, nada de lo demás en este archivo se
puede ni medir.

---

## 3. Ritual mensual de Search Console (30 min)

Orden deliberado: primero lo que impide indexar, después lo que mejora posiciones.
Ventana: **últimos 3 meses**, comparado con el periodo anterior.

### 3.1 Indexación de páginas — *primero, siempre*

Si una página no está indexada, nada más importa.

| Lo que ves | Qué significa | Qué tocar |
|---|---|---|
| "Descubierta, actualmente sin indexar" | La conoce pero no la prioriza — casi siempre contenido delgado o sin enlaces internos | Enlazarla desde `index.html` y desde el Journal |
| "Rastreada, actualmente sin indexar" | La leyó y decidió que no aporta | Muy parecida a otra página, o muy corta |
| "Página alternativa con etiqueta canónica adecuada" | Normal y sano | Nada |
| "Google eligió una canónica distinta" | ⚠️ Ignora tu `<link rel="canonical">` | Revisar `canonical` + `og:url` de esa página |
| "Indexada aunque bloqueada por robots.txt" | ⚠️ La trampa de §3.6 | Ver §3.6 |

**Comprobación fija: deben ser 12 páginas indexadas** *(11 hasta agosto 2026; +1 al
publicarse `/es/`)*. El repo tiene 14 HTML; se
excluyen `thanks.html` y `404.html`, ambas `noindex` y ambas fuera del sitemap a
propósito. Más de 12 = se coló algo. Menos = hay una página caída del índice.
`tools/seo-check.mjs` verifica la correspondencia sitemap ↔ páginas en cada commit.

### 3.2 Sitemaps

- Estado **"Correcto"** y última lectura dentro del último mes.
- "Páginas descubiertas" = 11.
- "No se ha podido obtener" → Cloudflare sirve un error o caché viejo; purgar y reenviar.

El validador garantiza que toda página indexable esté y que ninguna `noindex` se cuele.
Lo que **no** puede saber es si Google lo leyó: eso solo está aquí.

### 3.3 Rendimiento — dónde está el dinero

Cuatro cortes, no el total:

1. **Consultas con impresiones y 0 clics** → apareces pero no te eligen. Es el `<title>`
   o la `description`, no el contenido. Cinco páginas tienen hoy títulos de 68–73 chars
   que Google trunca (§5.3): empezar por ahí.
2. **Consultas en posición 8–20** → la fruta madura. De aquí sale el calendario editorial.
3. **País: Colombia vs. EE.UU./Europa.** Impresiones altas en Colombia con CTR bajo es la
   señal de que buscan en español y aterrizan en inglés → §5.1.
4. **Dispositivo.** Móvil suele ser >70%. El Performance de Lighthouse en móvil está hoy
   en 67 frente a 97 en escritorio: esa brecha es peso de imagen (§5.2).

> Anotar clics y posición media de las 5 consultas principales en §6 cada mes.

### 3.4 Experiencia / Core Web Vitals

- CWV usa **datos de campo reales** (CrUX): una corrección tarda ~28 días en reflejarse.
- Con poco tráfico puede no haber datos suficientes y el informe sale vacío; entonces
  usar PageSpeed Insights sobre `/` y `/reservar.html`.
- El sospechoso conocido es el LCP móvil: `index.html` arrastra ~5,5 MB de imágenes.

### 3.5 Mejoras / Resultados enriquecidos

`index.html` tiene cuatro bloques de primer nivel — `WebSite`, `TravelAgency`,
`SportsEvent` y `FAQPage` — y dentro de `TravelAgency.makesOffer` anida `Offer`,
`TouristTrip`, `ItemList` y `ListItem`. El Journal añade `BlogPosting` y
`BreadcrumbList`. Al leer el informe conviene tener presente el grafo completo, no solo
los bloques: un error en un tipo anidado invalida el bloque que lo contiene.

- **Un error anula el bloque entero**, no solo el campo con el fallo.
- El riesgo real es la **deriva** entre el schema y la copia visible. Ya ocurrió dos
  veces con la misma pregunta: el `FAQPage` decía *"How small are the groups?"* mientras
  la página decía *"How small are the groups, really?"*. `tools/seo-check.mjs` compara
  precio y preguntas del FAQ contra el texto visible y **falla** si divergen.

### 3.6 La trampa `Disallow` + `noindex` *(corregida, no reintroducir)*

`robots.txt` tenía `Disallow: /thanks.html` y `Disallow: /dossier/` mientras `_headers`
les ponía `X-Robots-Tag: noindex`. **Juntos se anulan:** si Google no puede rastrear la
URL, nunca lee el `noindex`, y puede indexarla igual a partir de un enlace entrante —
sin snippet, como "Indexada aunque bloqueada por robots.txt".

Los `Disallow` se quitaron; la exclusión vive en `_headers` y en el `<meta robots>` de
`thanks.html`. El validador compara cada `Disallow` contra el bloque concreto de
`_headers` y falla si alguien los vuelve a poner.

### 3.7 Enlaces

Donde el sitio está más flojo, y no depende de escribir código:

- **`gfboyacamundial.com`** — el fundador dirige ese evento. Un enlace desde ahí es el
  backlink más autoritativo y barato disponible. Hoy va en un solo sentido.
- **`visitduitama.com`**, hoteles del itinerario, La Ciclería — ya se les enlaza; pedir
  reciprocidad.
- **Ride with GPS** — las 6 rutas publicadas son activos indexables; que el perfil
  enlace al sitio.
- **Google Business Profile** — ⚠ pendiente de crear (Duitama, Boyacá). Es la palanca
  local más barata que existe y vive fuera del repo: al crearlo, anotar aquí la cuenta
  propietaria y la fecha, igual que la verificación de Search Console en §2.

---

## 4. Estado a 2026-08-09

Corregido en esta rama:

| Hallazgo | Archivo |
|---|---|
| `Disallow` + `noindex` anulándose en `/thanks.html` y `/dossier/` (§3.6) | `robots.txt` |
| El `FAQPage` volvía a divergir del texto visible en una pregunta | `index.html` |
| El único `<img>` indexable del sitio (el LCP del hero) tenía `alt=""` | `index.html` |
| Los fotogramas rotatorios quedaban en el árbol de accesibilidad sin `aria-hidden` | `assets/js/site.js` |
| La verificación de Search Console no estaba documentada | `CLAUDE.md` |

Ya resuelto antes de esta rama, no volver a levantarlo: `lastmod` en las 11 URLs del
sitemap; `<h1>` en `reservar.html`; `description`/`canonical`/OG en `privacy.html`; los
6 artículos del Journal publicados; escalera `srcset` 750/900/1200/1800 en el hero;
`<main>` y orden de encabezados en las 13 páginas; cabeceras de seguridad; `404.html`
y `terminos.html`.

Pendiente → §5. Hallazgos nuevos sin arreglar → `FINDINGS-2026-08-09.md`.

---

## 5. Plan de visibilidad

### 5.1 El sitio en español es invisible para Google — *impacto máximo* · **HECHO 2026-08-23**

> **Resuelto:** `/es/index.html` existe, generada por `tools/build-es.mjs` desde el
> diccionario `ES`, con `hreflang` recíproco, canonical propia, entrada en el sitemap
> y regla en `_redirects`. El toggle EN/ES son ahora enlaces entre `/` y `/es/`.
> CI (`build-es --check`) impide que `/es/` se quede atrás. Queda por vigilar en la
> mensual: que Google la indexe y empiecen las impresiones en español (§3.3).
> El texto original de la propuesta, para contexto:

`site.js` tiene un diccionario `ES` con **334 claves** (contadas ejecutando el objeto y
leyendo `Object.keys().length`, no con regex sobre el código: el objeto declara varias
claves por línea y un patrón sobre el texto da ~204, que es falso). Cubren los 312
`data-i18n` de `index.html`. Es una edición completa del sitio en español.

Google **nunca la ha visto**: el cambio de idioma es un `innerHTML` en tiempo de
ejecución sobre la *misma* URL. Para un rastreador, `ridetheandes.co/` es una página en
inglés y punto. Cero visibilidad para `tour en bicicleta Boyacá`, `ciclismo en Colombia`,
`gran fondo Boyacá`, `cicloturismo Colombia` — el mercado donde la marca ya tiene
autoridad real por el Gran Fondo.

**Opción recomendada:** un generador (`tools/build-es.mjs`) que lea el diccionario `ES` y
emita `/es/index.html` con el español ya en el HTML, más `hreflang` recíproco:

```html
<link rel="alternate" hreflang="en" href="https://ridetheandes.co/">
<link rel="alternate" hreflang="es" href="https://ridetheandes.co/es/">
<link rel="alternate" hreflang="x-default" href="https://ridetheandes.co/">
```

Coste: introduce **un paso de generación** en un repo deliberadamente sin build, y hay
que re-generar al cambiar copy — el validador puede comprobar que `/es/` no se quedó
atrás. A cambio duplica la superficie indexable.

*Decisión pendiente.* Solo `hreflang`, sin URLs separadas, **no sirve**: sin una URL
propia que servir no hay nada que indexar en español.

### 5.2 Peso de imagen en las dos páginas que más importan — *impacto alto*

No es un problema global: 19 de las 58 imágenes (17,9 MB de 28,2 MB) **no las referencia
nadie** y por tanto no le cuestan nada al visitante — eso es lastre de repo, no de
rendimiento, y está en el archivo de hallazgos. Lo que sí pesa:

| Página | Imágenes que carga |
|---|---|
| `index.html` | ~5,5 MB |
| `journal/index.html` | ~4,1 MB |

Y entre las que sí se sirven, diez superan la norma de `AUDIT.md` (≤1400 px, ≤400 KB);
la peor es `culture-alto-cogollo-peloton.jpg`, 1848 px y 2,1 MB. Comprimirlas no toca ni
el diseño ni el HTML: mismo nombre, misma ruta. Es lo que separa el 67 de Performance en
móvil del 97 en escritorio.

### 5.3 Títulos que Google trunca — *impacto medio, esfuerzo mínimo*

Cinco páginas tienen `<title>` de 68–73 caracteres: los cuatro artículos largos del
Journal y `terminos.html`. Se cortan en el resultado de búsqueda, que es exactamente
donde se decide el clic. Acortar a ≤60 sube CTR sin tocar posiciones.

### 5.4 Las fotos no existen para Google Images — *impacto medio* · **PARCIAL 2026-08-24**

> **Hecho en `index.html` (y `/es/` vía el generador):** los 6 slots de etapa, los 4
> POI y los 5 hoteles son ahora `<img class="ph">` reales con `alt` descriptivo (el
> texto de los antiguos `aria-label`, ya traducido), `loading="lazy"` y dimensiones.
> El patrón CSS vive en styles.css § "FOTOS REALES <img> EN SLOTS". **Pendiente:** los
> fondos del journal (tarjetas del índice + heros de artículo), tour-media/guide-media/
> deck-mock del index, y las entradas `<image:image>` del sitemap. El texto original:

Hay **un solo `<img>`** en todo el sitio (el hero, que ahora ya lleva `alt` real). El
resto de la fotografía se carga como `background-image` CSS, que Google Images no indexa
y que no admite `alt`. Para una marca cuyo producto *es* el paisaje, es un canal entero
regalado.

No es trivial: `.has-photo` lleva degradados en `::after` y capas `z-index`, así que
convertir a `<img>` es una refactorización con riesgo de regresión visual sobre una
página de reservas en producción. **Por secciones, verificando cada una en deploy
preview**, empezando por las que más valen en búsqueda: los 6 `stage-*` y los 4 `poi-*`.

---

## 6. Registro mensual

Rellenar cada mes. **Sin serie histórica no se sabe qué funcionó.**

| Mes | Clics | Impr. | CTR | Pos. media | Págs. indexadas | CWV móvil | Nota |
|---|---|---|---|---|---|---|---|
| 2026-08 | | | | | 11 (esperado) | | Línea base. Verificación de propiedad sin confirmar (§2) |

---

## 7. Qué cubre `tools/seo-check.mjs`

**Errores** (bloquean el merge y, si se conecta como build command, el deploy):

- `canonical` presente, absoluta, del dominio correcto y coincidente con la ruta real
- `title`, `description`, Open Graph completo, `og:image` absoluta y existente en disco
- exactamente un `<h1>`; `<html lang>` presente
- todo JSON-LD parsea; precio y preguntas del FAQ coinciden con el texto visible
- toda página indexable está en el sitemap; ninguna `noindex` se coló
- `<lastmod>` presente, con formato válido y no futuro
- `robots.txt` declara el sitemap y no reintroduce la trampa `Disallow` + `noindex`
- nada de `PLACEHOLDER` / `TODO` / `[pending]` visible en producción

**Avisos** (no bloquean; se revisan en la mensual): longitud de `title`/`description`,
imágenes en uso fuera de norma, imágenes huérfanas, presupuesto de peso por página,
`alt` vacíos, fotos como `background-image`, ausencia de `hreflang` habiendo dos idiomas.

Detalles que el validador tiene en cuenta y conviene no romper al editarlo:

- `thanks.html` y `404.html` están exentas de canonical/OG/sitemap: son `noindex` a
  propósito. Añadir una página nueva de ese tipo exige añadirla a `NOINDEX`.
- Los `<h1>` se cuentan **sobre el HTML sin comentarios**: `index.html` documenta la
  decisión del `alt` del hero y la cadena `<h1>` aparece literal dentro de ese comentario.
- El tope de 1400 px **no aplica** a la cima de una escalera `srcset` (un archivo con
  hermanos `-750/-900/-1200`): esos 1800 px son deliberados.
- Una imagen cuenta como referenciada por su nombre, por su nombre sin extensión
  (`data-imgs="hero-band-2-lago-tota"`) o, si es un peldaño, por la base de su escalera
  (`site.js` concatena el sufijo en runtime). Sin esas tres reglas el conteo de
  huérfanas da 27 en vez de 19.
- El presupuesto por página suma **un solo peldaño por escalera** (el mayor): con
  `srcset` el navegador descarga uno, no los cuatro.

Lo que **no** puede saber, y por eso el ritual mensual sigue existiendo: si Google
efectivamente indexó, qué consultas traen gente, y qué dicen los datos de campo de CWV.
