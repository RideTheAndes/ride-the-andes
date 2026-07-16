# Ride The Andes — sitio web

Sitio estático de Ride The Andes S.A.S (Boyacá, Colombia).

## Estructura
- `index.html` — landing principal (bilingüe EN/ES)
- `journal/` — blog editorial (SEO)
- `privacy.html` — política de datos (Ley 1581)
- `thanks.html` — página post-formulario
- `assets/css/styles.css` — hoja de estilos compartida
- `assets/js/site.js` — lógica del sitio (toggle idioma, nav, FAQ, formulario)
- `assets/img/` — fotografías (26 imágenes curadas)
- `sitemap.xml` / `robots.txt` — SEO

## Deploy
Conectado a Netlify vía GitHub. Cada `git push` a `main` publica automáticamente.
Formulario de contacto gestionado por Netlify Forms → notifica a reservations@ridetheandes.co

## Pendiente
- Reemplazar `poi-raquira-PLACEHOLDER-stock.jpg` por foto propia
- Foto real de Villa de Leyva y retrato de guía definitivo
- Imagen `og-image.jpg` para compartir en redes
- Integración de pasarela de pago (PayPal/Stripe) cuando el banco autorice
