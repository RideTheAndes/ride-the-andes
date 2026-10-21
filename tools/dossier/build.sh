#!/bin/zsh
# Genera los PDF del dossier de ruta desde dossier-en.html y dossier-es.html (Chrome sin pantalla).
#   zsh tools/dossier/build.sh
# Salida: dossier/ride-the-andes-boyaca-traverse-2027.pdf y …-2027-es.pdf (15 páginas A4 cada uno).
# Las fuentes vienen de Google Fonts: hace falta red. Las fotos están en tools/dossier/img/
# (sacadas del PDF de la edición fundadora, v1.9, el 21 oct 2026).
set -e
cd "${0:A:h}"
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
for L in en es; do
  PERFIL=$(mktemp -d)   # perfil nuevo por idioma: reusar uno hace fallar al segundo Chrome
  if [[ $L == es ]]; then SUF=-es; else SUF=; fi
  OUT=../../dossier/ride-the-andes-boyaca-traverse-2027$SUF.pdf
  "$CHROME" --headless=new --disable-gpu --no-pdf-header-footer --user-data-dir="$PERFIL" \
    --virtual-time-budget=20000 --run-all-compositor-stages-before-draw \
    --print-to-pdf="$OUT" "file://$PWD/dossier-$L.html" 2>/dev/null
  rm -rf "$PERFIL"
  echo "$OUT"
done
