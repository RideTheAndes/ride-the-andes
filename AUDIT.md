# AUDIT.md — Checklist de auditoría periódica · ridetheandes.co
*Última auditoría completa: 31 de julio de 2026. Este archivo vive en la raíz del repo; actualizar la fecha en cada revisión.*

## Antes de CADA commit a main (2 min)
- [ ] ¿Toqué `reservar.html` o `site.js`? → probar el flujo de pago en el deploy preview de Netlify ANTES de merge (rama → preview → merge; los previews no consumen créditos)
- [ ] ¿Página nueva o `<head>` tocado? → contrastar contra `RTA-estandar-web-head.md`: Plausible limpio, canonical `https://ridetheandes.co/...`, OG completo con imagen absoluta, fuentes de marca
- [ ] Push → esperar ~30 s de Netlify → **purgar caché de Cloudflare** → verificar en incógnito y en el teléfono

## Semanal (10 min) — mientras haya campaña activa
- [ ] **Formulario de leads:** enviar una prueba real desde el móvil → debe llegar a reservations@ y contarse como Goal /thanks.html en Plausible
- [ ] **Pago:** abrir reservar.html en incógnito → botones de PayPal renderizan; cambiar paquete/suplemento → el total recalcula
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

## Cada cambio de temporada de ventas (nueva salida, nuevo precio)
- [ ] Actualizar: fecha de corte del depósito (JS), textos de fechas (EN y ES en site.js Y en los HTML), precios en HTML + PRICES del widget + schema JSON-LD (price), sitemap `<lastmod>`
- [ ] Prueba de pago real de $1 con TEST_MODE → reembolso → apagar TEST_MODE
- [ ] Verificar USE_LIVE en `true` y el Client ID correcto ANTES de anunciar

## Qué automatizar cuando haya espacio (baja el trabajo de la próxima auditoría a la mitad)
1. **Netlify build check ligero** (aunque el sitio no tenga build, Netlify permite un comando): script node que valide JSON-LD parseable, canonical con dominio correcto, y ausencia de "[pending]"/"PLACEHOLDER" en HTML → falla el deploy si encuentra algo
2. **UptimeRobot (gratis)** sobre `/` y `/reservar.html` con alerta al correo
3. **Alerta de formularios:** notificación de Netlify Forms también a un segundo correo/WhatsApp del equipo
4. **Lighthouse CI o PageSpeed API mensual** con registro del score para ver tendencia
