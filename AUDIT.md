# AUDIT.md — Checklist de auditoría periódica · ridetheandes.co
*Última auditoría completa: 9 de agosto de 2026. Este archivo vive en la raíz del repo; actualizar la fecha en cada revisión.*

## Antes de CADA commit a main (2 min)
- [ ] **`node tools/seo-check.mjs`** → 0 errores. Cubre canonical, OG, JSON-LD, sitemap, robots y coherencia precio/FAQ. El ritual mensual de Search Console está en `SEO.md`
- [ ] ¿Toqué `reservar.html` o `site.js`? → probar el flujo de pago en el deploy preview de Netlify ANTES de merge (rama → preview → merge; los previews no consumen créditos)
- [ ] ¿Página nueva o `<head>` tocado? → contrastar contra `RTA-estandar-web-head.md`: Plausible limpio, canonical `https://ridetheandes.co/...`, OG completo con imagen absoluta, fuentes de marca
- [ ] Push → esperar ~30 s de Netlify → **purgar caché de Cloudflare** → verificar en incógnito y en el teléfono

## Semanal (10 min) — mientras haya campaña activa
- [ ] **Formulario de leads:** enviar una prueba real desde el móvil → debe llegar a reservations@ y contarse como Goal /thanks.html en Plausible
- [ ] **Pago:** abrir reservar.html en incógnito → botones de PayPal renderizan; cambiar paquete/suplemento → el total recalcula. **No hacer clic en el botón**: con TEST_MODE apagado cobra el precio real
- [ ] **Montos recibidos:** cotejar cada pago de PayPal contra la reserva ANTES de confirmar el cupo. El precio se calcula en el navegador, así que alguien con las herramientas de desarrollador puede pagar menos de lo que vale el paquete. Un monto que no cuadra no es un cupo confirmado
- [ ] **Plausible:** ¿visitas coherentes con la actividad de Instagram? ¿el Goal registra? (recordar `plausible_ignore` en tus propios navegadores)
- [ ] Netlify → Forms: revisar `inquiry` y `payment-notification` por envíos no notificados o spam que pasó el honeypot

## Mensual (30 min)
- [ ] **Search Console:** Cobertura (errores noindex/404/duplicados), rendimiento de búsqueda del Journal, sitemap procesado sin errores
- [ ] **Enlaces externos:** RWGPS (embed + 6 rutas), gfboyacamundial.com, wa.me, Instagram — que ninguno esté caído
- [ ] **Fechas quemadas:** buscar en el repo la fecha de corte del depósito y los textos de saldo/salida → ¿siguen vigentes? (grep: `2026-09-03`, `September 17`, `30 días`)
- [ ] **OG al compartir:** pegar ridetheandes.co en WhatsApp → ¿sale la preview? Si se cambió og-image: Facebook Sharing Debugger + LinkedIn Post Inspector para refrescar caché
- [ ] **Peso:** ¿entraron imágenes nuevas a assets/img sin comprimir? (regla: ancho ≤ 1400 px para bloques grandes, ≤ 900 px para tarjetas, JPEG q75)
- [ ] Consola del navegador en index, reservar, journal y artículo: cero errores

## Trimestral (1–2 h)
- [ ] Lighthouse móvil en index y reservar (Performance / A11y / SEO ≥ 90 como meta)
- [ ] Repasar la tabla de hallazgos de la última auditoría: ¿los P2/P3 aplazados siguen aplazables?
- [ ] `grep -rn "TODO\|pending\|PLACEHOLDER\|\[pending\]" --include=*.html .` → nada visible en producción
- [ ] Revisar que reservar.html y site.js sigan teniendo UNA sola copia de la lógica de pago (nunca duplicarla)
- [ ] Textos legales: ¿algo cambió en precios/políticas que Yésica deba re-validar?

## ⚠ Fechas que apagan la venta solas (interruptor manual: FORCE_OPEN)

El widget de pago tiene **dos cortes automáticos por fecha** en `reservar.html`. Nadie los
dispara a mano: llegan solos y cambian lo que ve el comprador.

| Fecha | Constante | Qué pasa ese día |
|---|---|---|
| **3 de septiembre de 2026** | `DEPOSIT_CUTOFF` | Se desactiva la opción de depósito. Desde el día 4 sólo se puede pagar el 100%. |
| **17 de septiembre de 2026** | `SALES_CLOSE` | **El widget entero se oculta.** La página muestra "reservas cerradas" y ya no se puede cobrar. |

### Cómo volver a abrir las ventas (una sola línea)

En `reservar.html`, dentro del bloque `RTA_PAY` al inicio del script:

```js
FORCE_OPEN: false,   // ← poner en true para reabrir
```

`FORCE_OPEN: true` ignora `SALES_CLOSE` y vuelve a mostrar el widget, sin tocar ninguna
otra línea. Úsalo si se amplía el plazo o se abre una salida nueva.

**Antes de reabrir, revisa siempre:** las fechas de salida en el texto, los precios
(`PRICES`), el `DEPOSIT_CUTOFF`, la fecha de saldo y el `price` del JSON-LD en
`index.html`. `FORCE_OPEN` sólo reabre la caja — no actualiza nada de eso.

> Ojo: `FORCE_OPEN` **no** desactiva `DEPOSIT_CUTOFF`. Si reabres después del 3 de
> septiembre, el comprador sólo verá la opción de pago total; para reactivar el depósito
> hay que mover también esa fecha.

### Estado actual de los cobros (verificado 9 de agosto de 2026)

- `USE_LIVE: true` · `TEST_MODE: false` → **se cobra dinero real**.
- Probado en producción con dos cobros de USD 1: uno con tarjeta de crédito y otro con
  saldo PayPal desde Canadá (cross-border). Ambos capturaron correctamente.
- Si vuelves a poner `TEST_MODE: true` para una prueba, **acuérdate de apagarlo otra vez**:
  con él encendido todos los botones cobran USD 1,00 en vez del precio real.

## Si un pago entró pero no llegó la notificación

PayPal siempre te avisa por su cuenta (correo de "recibiste un pago"), así que **una venta
nunca se pierde**. Lo que puede perderse es el *contexto*: qué paquete, si llevaba
suplemento individual, si fue depósito o pago total. Eso viaja en la notificación de
Netlify Forms (`payment-notification`), no en el correo de PayPal.

El navegador del comprador intenta entregarla por tres vías (`sendBeacon`, luego `fetch`
con un reintento) y **siempre guarda una copia local antes de intentarlo**. Si nada llegó:

1. Cruza el `paypal-order-id` del correo de PayPal con Netlify → **Forms** →
   `payment-notification`.
2. Si no aparece ahí, pídele al comprador (o al navegador donde se pagó) que abra la
   consola en ridetheandes.co y ejecute:
   ```js
   JSON.parse(localStorage.getItem('rta-orders'))
   ```
   Devuelve los últimos 20 pedidos con `ts`, `via` y todos los datos. `via` dice por dónde
   salió: `beacon` / `fetch` = entregado; `failed` o `pending` = no salió.
3. Verifica el monto contra PayPal antes de confirmar el cupo. **PayPal es la fuente de
   verdad del dinero**; esta notificación es sólo administrativa.

Revisa Netlify → Forms al menos una vez por semana mientras haya campaña: es la lista de
reservas que no se reconstruye sola.

## Cada cambio de temporada de ventas (nueva salida, nuevo precio)
- [ ] Actualizar: fecha de corte del depósito (JS), textos de fechas (EN y ES en site.js Y en los HTML), precios en HTML + PRICES del widget + schema JSON-LD (price **y `validThrough` de la Offer** — `tools/seo-check.mjs` avisa cuando caduca), sitemap `<lastmod>`
- [ ] Prueba de pago real de $1 con TEST_MODE → reembolso → apagar TEST_MODE. **La prueba tiene que hacerla alguien fuera de Colombia**, por las dos vías (botón de tarjeta y cuenta PayPal). PayPal Colombia solo procesa pagos transfronterizos: cualquier prueba hecha desde acá — tarjeta nacional, tarjeta "internacional" emitida en Colombia, o tu propia cuenta PayPal — falla con *"This card can't be used for your payment"* y no prueba absolutamente nada
- [ ] Verificar USE_LIVE en `true` y el Client ID correcto ANTES de anunciar
- [ ] Si un pago falla: los logs de la app solo muestran los 201 de creación de orden, nunca el motivo del rechazo. El motivo real solo lo ve soporte de PayPal, y necesita el **Debug ID** del intento (dashboard → la app → logs)

## Qué automatizar cuando haya espacio (baja el trabajo de la próxima auditoría a la mitad)
1. ~~**Netlify build check ligero**~~ → **hecho:** `tools/seo-check.mjs`, conectado como job `seo-check` en `.github/workflows/main.yml`. Corre en cada PR y en cada push a main. **A propósito NO es build command de Netlify:** mientras `reservar.html` cobre de verdad, un falso positivo dejaría el sitio sin poder desplegar un arreglo urgente (ver `SEO.md` § "Dónde vive la comprobación")
2. **UptimeRobot (gratis)** sobre `/` y `/reservar.html` con alerta al correo
3. **Alerta de formularios:** notificación de Netlify Forms también a un segundo correo/WhatsApp del equipo
4. **Lighthouse CI o PageSpeed API mensual** con registro del score para ver tendencia
