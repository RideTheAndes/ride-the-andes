# NEXT-SESSION.md — dónde retomar

*Estado a 17 de noviembre de 2026. Este archivo se actualiza al cerrar cada sesión: es lo primero que debe leer quien retome.*

Antes de tocar nada: `CLAUDE.md` (cómo está hecho el sitio), `AUDIT.md` (rituales
y fechas que caducan solas), `SEO.md` (Search Console ↔ repo) y `PLAN-2027.md`
(trabajo aplazado a propósito). Contradecirlos sin leerlos ya ha costado tiempo.

> **Salida piloto de octubre 2026:** No se operó por falta de demanda (cero reservas).
> En los PRs #31 y #32 (20–22 de octubre de 2026), el sitio migró completamente al
> calendario de 4 salidas para 2027: 22–31 de enero (principal), 15–24 de mayo, 20–29 de
> agosto y 9–18 de octubre (USD 4.500 ciclista / 4.000 acompañante / +800 suplemento /
> 500 depósito). Perfil comercial y operativo reorientado a la captación de 2027.

Comprobación de que todo sigue sano, dos comandos:

```bash
node tools/seo-check.mjs      # 0 errores (los avisos de title/desc largos son conocidos)
node tools/build-es.mjs --check
```

---

## 1. Bloqueado esperando a alguien (no es trabajo de código)

| # | Qué | Quién | Por qué importa |
|---|---|---|---|
| **1.1** | Quitar el banner *"Borrador para validación legal"* de `privacy.html` y `terminos.html` | **Yésica** (Hugo hace seguimiento) | **Sigue publicado** (verificado 17-nov-2026) mientras se venden las salidas de 2027: el comprador lee "borrador" justo al pagar. Al aprobarse: borrar los dos `<div class="draft">` y añadir `'Borrador'` y `'Draft pending'` a las agujas de `tools/seo-check.mjs` |
| **1.2** | Verificación de propiedad de Search Console | Sergio | No está documentada en ningún sitio. Si se cae se pierde el histórico de Rendimiento y **no se recupera**. Ficha a rellenar en `CLAUDE.md` § "Search Console: ownership verification" |
| **1.3** | Google Business Profile (Duitama) | Sergio | La palanca de búsqueda local más barata que queda. Anotar la cuenta dueña en `SEO.md` §3.7 al crearlo |
| **1.4** | Marcar `seo-check` como *required status check* en GitHub → Settings → Branches | Sergio | Hoy el validador avisa pero **no bloquea**: un PR en rojo se puede mergear igual |
| **1.5** | Claves SMTP Brevo para alias @ridetheandes.co | Sergio / Equipo | Brevo desactiva claves SMTP tras 90 días sin uso. Requiere prueba mensual de envío desde Gmail («Enviar mensaje como»). Ocurrió error 535 el 2026-11-17; la clave "newkey" se reactivó el 2026-11-18 (envíos de prueba entregados según Brevo → Transaccional → Logs). **Vence de todas formas el 2027-08-09**: antes de esa fecha generar una clave nueva y cambiarla en cada alias de Gmail. |

## 2. Siguiente trabajo de código, por orden de valor

1. **Fotos del Journal a `<img>` reales** — quedan los fondos CSS de las tarjetas
   del índice y los heros de artículo. Mismo patrón ya aplicado en `index.html`
   (`styles.css` § "FOTOS REALES `<img>` EN SLOTS"). Es lo que falta para cerrar
   `PLAN-2027` § Fase 2.
2. **Bloques `tour-media` / `guide-media` / `deck-mock`** de `index.html`, aún
   como `background-image`.
3. **Entradas `<image:image>` en el sitemap** una vez las fotos sean `<img>`.
4. **Presupuesto de imagen**: `index.html` carga ~4,5 MB (norma: 3 MB). Quedan
   cuatro archivos de 1440–1600 px que el validador ya señala.

*(Nota: el artículo de crónica de la 10ª edición del Gran Fondo Boyacá Mundial fue
publicado el 2026-10-20 en `journal/gran-fondo-boyaca-mundial-2026-la-10-and-the-tech-behind-it.html`).*

## 3. Fechas que se disparan solas — vigilar (Calendario 2027)

El widget de `reservar.html` calcula los plazos dinámicamente desde `DEPARTURES`:
depósito hasta 30 días antes de la llegada y venta hasta 16 días antes, ambos inclusive
hasta las 23:59:59 hora de Colombia. El saldo vence ese mismo día por contrato (T&C
cláusulas 2 y 4); el widget no cobra saldos, sólo depósito o precio total.

| Fecha | Qué pasa | Dónde |
|---|---|---|
| **2026-12-23** | `depositCutoff` enero 2027: último día con depósito para enero (30 días antes). A partir del 24 solo se puede pagar 100%. | `reservar.html` |
| **2027-01-06** | `salesClose` enero 2027: **último día de venta de enero** y vencimiento contractual del saldo (16 días antes). Desde el 7 el widget desactiva enero y selecciona mayo; el aviso (`data-until="2027-01-06"`) se oculta desde el 7 en la hora del visitante; `validThrough` del JSON-LD es esta fecha. | `reservar.html`, `index.html` |
| **2027-01-22** | Llegada de la salida principal (22 al 31 de enero de 2027). | Operación en ruta |
| **2027-04-15** | `depositCutoff` mayo 2027: último día con depósito para mayo. | `reservar.html` |
| **2027-04-29** | `salesClose` mayo 2027: último día de venta y vencimiento del saldo de mayo. | `reservar.html` |
| **2027-05-15** | Llegada de la salida de mayo (15 al 24 de mayo de 2027). | Operación en ruta |
| **2027-07-21** | `depositCutoff` agosto 2027: último día con depósito para agosto. | `reservar.html` |
| **2027-08-04** | `salesClose` agosto 2027: último día de venta y vencimiento del saldo de agosto. | `reservar.html` |
| **2027-08-09** | Vence la clave SMTP "newkey" de Brevo: sin clave nueva, los alias @ridetheandes.co de Gmail («Enviar como») rebotan con 535. Generar la nueva antes y actualizar cada alias. | Brevo, Gmail |
| **2027-08-20** | Llegada de la salida de agosto (20 al 29 de agosto de 2027). | Operación en ruta |
| **2027-09-09** | `depositCutoff` octubre 2027: último día con depósito para octubre. | `reservar.html` |
| **2027-09-23** | `salesClose` octubre 2027: último día de venta y vencimiento del saldo de octubre. | `reservar.html` |
| **2027-10-09** | Llegada de la salida de octubre (9 al 18 de octubre de 2027). | Operación en ruta |
| **2027-10-17** | 11ª edición del Gran Fondo Boyacá Mundial (Etapa 6 oficial). | Carrera |

## 4. Qué se hizo en las últimas tandas

- **PR #31 y #32 (Octubre 2026):**
  - Migración al calendario 2027: 4 salidas en `reservar.html`, `terminos.html`, `thanks.html` e `index.html`.
  - Términos v1.1 con las salidas 2027 (siguen marcados como borrador pendiente de validación legal; ver 1.1).
  - Generación de nuevo dossier PDF 2027 (EN y ES).
  - Publicación del artículo del Gran Fondo Boyacá Mundial 2026 ("La 10").
- **Auditoría de Fechas (Noviembre 2026 — `auditoria-fechas-2026-11`):**
  - Barrido completo de referencias obsoletas al piloto/fundadores.
  - Neutralización de la clave huérfana `pr_foot` en `assets/js/site.js`.
  - Corrección de suplemento individual en formulario (`ff_room_o4`) de $700 a $800 en `index.html`, `site.js` y `es/index.html`.
  - Actualización de fechas y rituales en `AUDIT.md` (chequeo mensual de claves SMTP Brevo).
  - Actualización de notas de estado en `PLAN-2027.md` y `NEXT-SESSION.md`.
  - Generación del informe de auditoría `FECHAS-2026-11.md`.

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
- **Brevo SMTP keys**: desactivación automática tras 90 días de inactividad;
  vigilar los alias de envío en Gmail.

## 6. Drive

Se creó la carpeta canónica **Ride The Andes** en el Drive de Sergio, con el
README de operación en `00 · Empieza aquí`. El Drive manda en la operación del
negocio; **este repo manda en el sitio web**. Si algo se contradice, gana el repo.
