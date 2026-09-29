Lee CLAUDE.md, AUDIT.md y NEXT-SESSION.md antes de cambiar nada.
Sitio estático sin build: no añadas npm, frameworks ni build command en Netlify.
Antes de la PR: `node tools/seo-check.mjs` (0 errores) y `node tools/build-es.mjs --check`.
es/index.html es generado: si tocas index.html o el diccionario ES, corre `node tools/build-es.mjs` y commitea el resultado.
No toques reservar.html (pagos PayPal reales), RTA_PAY, precios ni fechas sin que te lo pidan explícitamente.
Antes de dar una imagen por huérfana, busca también en site.js (data-imgs arma srcset -750/-900/-1200). No borres your-guide.jpg.
Imágenes nuevas: ≤1400 px, ≤400 KB, JPEG q75, sin EXIF.
404.html usa solo rutas absolutas. Contraste: calcula el color compuesto (opacity).
