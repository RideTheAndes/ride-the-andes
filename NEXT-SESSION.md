# NEXT-SESSION.md — dónde retomar

*Estado a 28 de agosto de 2026, contra `main` en `9a40741`. Este archivo se
actualiza al cerrar cada sesión: es lo primero que debe leer quien retome.*

Antes de tocar nada: `CLAUDE.md` (cómo está hecho el sitio), `AUDIT.md` (rituales
y fechas que caducan solas), `SEO.md` (Search Console ↔ repo) y `PLAN-2027.md`
(trabajo aplazado a propósito). Contradecirlos sin leerlos ya ha costado tiempo.

Comprobación de que todo sigue sano, dos comandos:

```bash
node tools/seo-check.mjs      # 0 errores (los ~8 avisos son conocidos)
node tools/build-es.mjs --check
```

---

## 1. Bloqueado esperando a alguien (no es trabajo de código)

| # | Qué | Quién | Por qué importa |
|---|---|---|---|
| **1.1** | Quitar el banner *"Borrador para validación legal"* de `privacy.html` y `terminos.html` | **Yésica** (Hugo hace seguimiento) | Se cobra dinero real contra esos términos y el comprador lee "borrador" justo al pagar. Al aprobarse: borrar los dos `<div class="draft">` y añadir `'Borrador'` y `'Draft pending'` a las agujas de `tools/seo-check.mjs` (~línea 219) para que no vuelvan |
| **1.2** | Verificación de propiedad de Search Console | Sergio | No está documentada en ningún sitio. Si se cae se pierde el histórico de Rendimiento y **no se recupera**. Ficha a rellenar en `CLAUDE.md` § "Search Console: ownership verification" |
| **1.3** | Google Business Profile (Duitama) | Sergio | La palanca de búsqueda local más barata que queda. Anotar la cuenta dueña en `SEO.md` §3.7 al crearlo |
| **1.4** | Marcar `seo-check` como *required status check* en GitHub → Settings → Branches | Sergio | Hoy el validador avisa pero **no bloquea**: un PR en rojo se puede mergear igual |

## 2. Siguiente trabajo de código, por orden de valor

1. **Artículo "guía del corredor del Gran Fondo"** — el activo de contenido con
   más retorno antes de la carrera de octubre, y la excusa para pedir el enlace
   recíproco desde gfboyacamundial.com (el backlink más barato y autoritativo
   disponible, hoy en un solo sentido). Redactarlo **sólo con datos verificables
   por el operador**; nada inventado sobre el recorrido.
2. **Fotos del Journal a `<img>` reales** — quedan los fondos CSS de las tarjetas
   del índice y los heros de artículo. Mismo patrón ya aplicado en `index.html`
   (`styles.css` § "FOTOS REALES `<img>` EN SLOTS"). Es lo que falta para cerrar
   `PLAN-2027` § Fase 2.
3. **Bloques `tour-media` / `guide-media` / `deck-mock`** de `index.html`, aún
   como `background-image`.
4. **Entradas `<image:image>` en el sitemap** una vez las fotos sean `<img>`.
5. **Presupuesto de imagen**: `index.html` carga ~4,5 MB (norma: 3 MB). Quedan
   cuatro archivos de 1440–1600 px que el validador ya señala.

## 3. Fechas que se disparan solas — vigilar

| Fecha | Qué pasa | Dónde |
|---|---|---|
| **2026-08-30** | Caduca el aviso de la 2ª Salida GFBM; se oculta solo y el validador empieza a avisar | `index.html` barra de avisos |
| **2026-09-03** | `DEPOSIT_CUTOFF`: se desactiva la opción de depósito | `reservar.html` |
| **2026-09-17** | `SALES_CLOSE`: **se oculta el widget de pago entero**. También caduca `Offer.validThrough` del JSON-LD | `reservar.html`, `index.html` |
| **2026-09-20** | Caduca el aviso de la 3ª Salida GFBM | `index.html` |
| **2026-10-11** | Gran Fondo Boyacá Mundial, 10ª edición | — |

Tras el 17 de septiembre hay que decidir: reabrir con `FORCE_OPEN: true` (ver
`AUDIT.md`) o pasar la página a las salidas de 2027. **No dejarla en "cerradas"
sin más**: es la página que recibe el tráfico de la carrera.

## 4. Qué se hizo en esta tanda (PR #22, #23, #24)

- **Google Images**: 15 fotos que eran fondos CSS pasaron a `<img>` reales con
  `alt` descriptivo en los dos idiomas. Antes: cero fotos indexables.
- **Mapa de rutas**: el embed mostraba sólo la Etapa 4 y en **millas**; ahora es
  el embed multi-ruta (RWGPS event 499137) con las seis etapas y en métrico.
- **Tarjetas de etapa**: la tarjeta entera abre su ruta (patrón *stretched link*,
  un solo `<a>` por tarjeta), con textos y nombres accesibles distintos.
- **Barra de avisos** con rotación, caducidad automática por `data-until` y
  descarte recordado. Documentada en `AUDIT.md` § "Barra de avisos".
- **Etapa 2** ya no es un hueco verde: foto del Puente de Boyacá (11,5 MB → 96 KB,
  EXIF eliminado).
- **Feed RSS** del Journal + `rel="alternate"` en las 7 páginas.
- **Contraste**: nuevo `--tierra-bright` para suelos oscuros (era 3,4:1) y
  `--terracota-bright` en las listas de artículos (era **1,37:1**, casi ilegible).
- Enlaces internos a URLs canónicas (se eliminaron 112 saltos 301), enlaces
  cruzados entre artículos, fechas visibles y `dateModified`.

## 5. Trampas conocidas de este repo

- **`/es/` es generado.** Tocar `index.html` o el diccionario `ES` obliga a
  `node tools/build-es.mjs` y commitear el resultado. CI falla si se olvida.
- **Nunca duplicar la lógica de pago.** Vive sólo inline en `reservar.html`.
- **Comprimir las imágenes ANTES de commitear.** Un original de 11,5 MB quedó
  para siempre en el histórico de git (llegó en `b44fad6`). Si se repite varias
  veces, ahí sí tocará reescribir historia.
- **El contraste se calcula compuesto**, no por token suelto: `opacity` sobre un
  color cambia el resultado. Ver `CLAUDE.md` § Contrast.
- **Capturas headless**: sin `--run-all-compositor-stages-before-draw` las fotos
  salen en blanco y parece un bug que no existe. Costó una vuelta averiguarlo.

## 6. Drive

Se creó la carpeta canónica **Ride The Andes** en el Drive de Sergio, con el
README de operación en `00 · Empieza aquí`. El Drive manda en la operación del
negocio; **este repo manda en el sitio web**. Si algo se contradice, gana el repo.
