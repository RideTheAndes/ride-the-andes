# Ride The Andes — sitio web

Sitio estático de Ride The Andes S.A.S (Duitama, Boyacá, Colombia) · [ridetheandes.co](https://ridetheandes.co).
**Sin build, sin dependencias:** editar los HTML/CSS/JS directamente es el flujo de desarrollo.

## Estructura
- `index.html` — landing principal (bilingüe EN/ES con toggle en runtime)
- `reservar.html` — página de reserva y pago (PayPal, lógica inline; **cobra dinero real**)
- `journal/` — blog editorial: índice + 6 artículos
- `terminos.html` / `privacy.html` — textos legales (T&C de compra · Ley 1581)
- `thanks.html` — post-formulario y confirmación de pago (noindex)
- `404.html` — página de error (todas sus rutas absolutas, a propósito)
- `assets/` — CSS compartido, `site.js` (i18n/nav/FAQ/hero) y fotografía
- `dossier/` — PDF del route dossier (noindex)
- `sitemap.xml` / `robots.txt` / `_headers` / `_redirects` — SEO y despliegue

## Deploy
Netlify vía GitHub: cada push a `main` publica en ~30 s, con Cloudflare en frente
(purgar su caché tras cambios). Formularios por Netlify Forms (`inquiry` y
`payment-notification`) → notifican a reservations@ridetheandes.co.

## Comprobaciones antes de merge
- `node tools/seo-check.mjs` → 0 errores (canonical, OG, JSON-LD, sitemap, robots).
- CI (`.github/workflows/main.yml`): snippet de Plausible + validador SEO en cada PR.
- ¿Se tocó `reservar.html` o `site.js`? → probar el pago en el deploy preview (ver `AUDIT.md`).

## Documentación
- `CLAUDE.md` — guía técnica del repo (leer primero)
- `AUDIT.md` — checklist operativo: pagos, fechas, temporada, `FORCE_OPEN`
- `SEO.md` — ritual mensual de Search Console ↔ repo
- `PLAN-2027.md` — trabajo SEO aplazado hasta cerrar la salida de octubre 2026
