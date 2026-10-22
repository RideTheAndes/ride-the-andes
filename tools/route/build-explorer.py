"""Genera los datos y el relieve del explorador de ruta de index.html (sección #route).

    python3 -I tools/route/build-explorer.py            # escribe assets/data/traverse.json y assets/img/relief/*.webp
    python3 -I tools/route/build-explorer.py --check    # sólo comprueba que traverse.json está al día con las fuentes

No hay paso de build en el sitio: lo que este script escribe se commitea tal cual. Volver a correrlo
sólo cuando cambie una ruta (tools/route/src/stages.json), un lago o un pueblo.

Fuentes (tools/route/src/):
  stages.json  etapas 1–5 = nuestras rutas públicas de Ride with GPS (track_points tal cual: lat, lon,
               ele, distancia acumulada en m); etapa 6 = el GPX oficial del Gran Fondo 2026.
  lakes.json   lagos y embalses de OpenStreetMap (natural=water, > 0,35 km²).
  places.json  pueblos de OpenStreetMap (place=city|town|village).
Relieve: teselas de elevación Terrarium (Mapzen / AWS Open Data, SRTM) — se bajan a una caché local
(fuera del repo, ver CACHE) la primera vez.

Sistema de coordenadas de salida: píxeles Web Mercator a zoom 13 relativos a ORIGIN, así el navegador
no proyecta nada: el SVG usa esas unidades en su viewBox y las imágenes de relieve llevan sus límites
en las mismas unidades.
"""
import json, math, os, subprocess, sys
import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SRC = os.path.join(ROOT, 'tools/route/src')
OUT_JSON = os.path.join(ROOT, 'assets/data/traverse.json')
OUT_IMG = os.path.join(ROOT, 'assets/img/relief')
CACHE = os.path.expanduser('~/.cache/rta-terrarium')
ZB = 13                                   # zoom de referencia de las coordenadas
BBOX = (4.30, -74.80, 6.30, -72.05)       # S, W, N, E: holgado alrededor de El Dorado…Gámeza para llenar el encuadre
# Cifras publicadas en las tarjetas de etapa (Ride with GPS). Mandan sobre lo medido en el GPX para
# que el explorador y las tarjetas digan lo mismo; lo demás (techo, rampa) sale de los datos.
PUBLISHED = {1: (34.0, 290), 2: (53.0, 527), 3: (53.3, 759), 4: (51.6, 1004), 5: (49.8, 506), 6: (143.6, 2120)}
# Pueblos que se rotulan: rango 1 = siempre, 2 = sólo al acercarse a una etapa.
LABELS = {'Bogotá': 1, 'Guatavita': 1, 'Sopó': 2, 'Zipaquirá': 1, 'Ráquira': 2, 'Villa de Leyva': 1,
          'Sutamarchán': 2, 'Santa Sofía': 2, 'Tunja': 1, 'Iza': 2, 'Sogamoso': 1, 'Aquitania': 2,
          'Cuítiva': 2, 'Firavitoba': 2, 'Paipa': 1, 'Duitama': 1, 'Monguí': 2, 'Tópaga': 2,
          'Gámeza': 2, 'Nobsa': 2, 'Tibasosa': 2, 'Arcabuco': 2, 'Santa Rosa de Viterbo': 2}
LAKE_NAMES = {'Laguna de Tota': 'Lago de Tota', 'Sochagota': 'Lago Sochagota', 'Embalse de Tominé': 'Tominé'}
# Sólo se dibujan estos cuerpos de agua (más los grandes sin nombre, como Fúquene): el resto es ruido a esta escala.
LAKES_KEEP = set(LAKE_NAMES) | {'Embalse de Neusa', 'Embalse del Sisga', 'Embalse La Copa', 'Laguna de Suesca', 'Laguna de Cucunubá'}


def wx(lon, z=ZB): return (lon + 180) / 360 * 256 * 2 ** z
def wy(lat, z=ZB):
    r = math.radians(lat)
    return (1 - math.log(math.tan(r) + 1 / math.cos(r)) / math.pi) / 2 * 256 * 2 ** z


X0, Y0 = wx(BBOX[1]), wy(BBOX[2])
def P(lat, lon): return (wx(lon) - X0, wy(lat) - Y0)


def hav(a, b):
    t = math.pi / 180
    dp, dl = (b[0] - a[0]) * t, (b[1] - a[1]) * t
    h = math.sin(dp / 2) ** 2 + math.cos(a[0] * t) * math.cos(b[0] * t) * math.sin(dl / 2) ** 2
    return 2 * 6371000 * math.asin(math.sqrt(h))


def dp(pts, tol):
    """Douglas–Peucker sobre (x, y, ...) conservando el resto de campos."""
    if len(pts) < 3: return pts
    keep = [False] * len(pts); keep[0] = keep[-1] = True; st = [(0, len(pts) - 1)]
    while st:
        a, b = st.pop(); ax, ay = pts[a][:2]; bx, by = pts[b][:2]; L = math.hypot(bx - ax, by - ay); md, ix = 0, 0
        for i in range(a + 1, b):
            x, y = pts[i][:2]
            d = math.hypot(x - ax, y - ay) if L < 1e-9 else abs((by - ay) * (x - ax) - (bx - ax) * (y - ay)) / L
            if d > md: md, ix = d, i
        if md > tol: keep[ix] = True; st += [(a, ix), (ix, b)]
    return [p for p, k in zip(pts, keep) if k]


# ───────────────────────────── relieve ─────────────────────────────
def dem(s, w, n, e, z):
    x0, x1 = int(wx(w, z) // 256), int(wx(e, z) // 256)
    y0, y1 = int(wy(n, z) // 256), int(wy(s, z) // 256)
    os.makedirs(CACHE, exist_ok=True); rows = []
    for ty in range(y0, y1 + 1):
        row = []
        for tx in range(x0, x1 + 1):
            fn = f'{CACHE}/{z}_{tx}_{ty}.png'
            if not os.path.exists(fn):
                subprocess.run(['curl', '-fsS', '--max-time', '60', '-o', fn,
                                f'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{tx}/{ty}.png'], check=True)
            a = np.asarray(Image.open(fn).convert('RGB')).astype(np.float32)
            row.append(a[:, :, 0] * 256 + a[:, :, 1] + a[:, :, 2] / 256 - 32768)
        rows.append(np.hstack(row))
    m = np.vstack(rows)
    px0, px1 = int(wx(w, z) - x0 * 256), int(wx(e, z) - x0 * 256)
    py0, py1 = int(wy(n, z) - y0 * 256), int(wy(s, z) - y0 * 256)
    return m[py0:py1, px0:px1]


# Rampa hipsométrica para fondo oscuro (sección en --paramo-deep): valles casi negros, páramo ocre.
RAMP = [(1200, (10, 24, 7)), (2000, (16, 36, 10)), (2600, (28, 56, 17)), (3000, (46, 70, 26)),
        (3400, (78, 84, 40)), (3800, (112, 104, 62)), (4500, (150, 140, 104))]


def tint(h):
    out = np.zeros(h.shape + (3,), np.float32)
    xs = [r[0] for r in RAMP]
    for c in range(3): out[..., c] = np.interp(h, xs, [r[1][c] for r in RAMP])
    return out


def relief(s, w, n, e, z, exag, maxw, name):
    h = dem(s, w, n, e, z)
    h = np.maximum(h, 0)
    cell = 40075016.686 * math.cos(math.radians((s + n) / 2)) / 2 ** z / 256
    gy, gx = np.gradient(h, cell)
    slope = np.arctan(np.hypot(gx, gy) * exag); aspect = np.arctan2(-gx, gy)
    az, alt = math.radians(315), math.radians(42)
    hs = np.clip(np.sin(alt) * np.cos(slope) + np.cos(alt) * np.sin(slope) * np.cos(az - aspect), 0, 1)
    rgb = tint(h) * (0.38 + 1.05 * hs[..., None]) + 10 * hs[..., None] ** 4
    im = Image.fromarray(np.clip(rgb, 0, 255).astype(np.uint8))
    if im.width > maxw: im = im.resize((maxw, round(im.height * maxw / im.width)), Image.LANCZOS)
    os.makedirs(OUT_IMG, exist_ok=True)
    im.save(f'{OUT_IMG}/{name}.webp', quality=72, method=6)
    x, y = P(n, w); x2, y2 = P(s, e)
    return {'src': f'assets/img/relief/{name}.webp', 'b': [round(x), round(y), round(x2 - x), round(y2 - y)]}


# ───────────────────────────── etapas ─────────────────────────────
def stage_data(st):
    pts = st['pts']
    if st['stage'] == 6:   # el GPX trae elevación ruidosa: media móvil de 9 puntos
        e = np.convolve([p[2] for p in pts], np.ones(9) / 9, mode='same'); e[:4] = pts[4][2]; e[-4:] = pts[-5][2]
        pts = [[p[0], p[1], float(v), p[3]] for p, v in zip(pts, e)]
    total = pts[-1][3]
    prof, nxt = [], 0
    for p in pts:
        while p[3] >= nxt and nxt <= total: prof.append(round(p[2])); nxt += 100
    # rampa: la mayor pendiente media sostenida en 1 km
    steep = max((prof[i + 10] - prof[i]) / 10 for i in range(len(prof) - 10))
    line = dp([(*P(p[0], p[1]), p[3] / 1000) for p in pts], 1.4)
    km, gain = PUBLISHED[st['stage']]
    xs, ys = [p[0] for p in line], [p[1] for p in line]
    return {'n': st['stage'], 'km': km, 'gain': gain, 'top': round(max(prof)), 'low': round(min(prof)),
            'steep': round(steep, 1), 'len': round(total / 1000, 2),
            'line': [[round(x, 1), round(y, 1), round(k, 2)] for x, y, k in line],
            'prof': prof, 'box': [round(min(xs)), round(min(ys)), round(max(xs) - min(xs)), round(max(ys) - min(ys))],
            'll': [[pts[0][0], pts[0][1]], [pts[-1][0], pts[-1][1]]]}


def build():
    stages = [stage_data(s) for s in json.load(open(f'{SRC}/stages.json'))]
    lakes = []
    for L in json.load(open(f'{SRC}/lakes.json')):
        ring = dp([P(a, b) for a, b in L['ring']], 2.5)
        area = abs(sum(x1 * y2 - x2 * y1 for (x1, y1), (x2, y2) in zip(ring, ring[1:] + ring[:1]))) / 2
        cx = sum(x for x, _ in ring) / len(ring)
        fuquene = not L['name'] and area > 56000 and cx < P(5.45, -73.6)[0]   # el único grande sin nombre que interesa
        if len(ring) < 4 or not (L['name'] in LAKES_KEEP or fuquene): continue   # 2.800 px² ≈ 1 km²
        d = 'M' + 'L'.join(f'{x:.0f} {y:.0f}' for x, y in ring) + 'Z'
        lakes.append({'d': d, 'name': LAKE_NAMES.get(L['name'])})
    towns = []
    for p in json.load(open(f'{SRC}/places.json')):
        if p['name'] in LABELS:
            x, y = P(p['lat'], p['lon']); towns.append({'t': p['name'], 'x': round(x), 'y': round(y), 'r': LABELS[p['name']]})
    W, H = P(BBOX[0], BBOX[3])
    images = {'all': relief(*BBOX, 10, 2.6, 2000, 'relief-all')}
    for s in stages:
        x, y, w, h = s['box']; m = max(w, h) * 0.75 + 600   # holgado: la tarjeta tapa el lado izquierdo del encuadre
        lon0 = (x - m + X0) / (256 * 2 ** ZB) * 360 - 180; lon1 = (x + w + m + X0) / (256 * 2 ** ZB) * 360 - 180
        def lat(py): return math.degrees(math.atan(math.sinh(math.pi * (1 - 2 * (py + Y0) / (256 * 2 ** ZB)))))
        images[f's{s["n"]}'] = relief(lat(y + h + m), lon0, lat(y - m), lon1, 12, 1.7, 1800, f'relief-s{s["n"]}')
    return {'_': 'GENERADO por tools/route/build-explorer.py — no editar a mano',
            'size': [round(W), round(H)], 'images': images, 'stages': stages, 'lakes': lakes, 'towns': towns,
            'start': [round(c) for c in P(4.7016, -74.1469)]}   # Aeropuerto El Dorado


if __name__ == '__main__':
    data = build()
    s = json.dumps(data, ensure_ascii=False, separators=(',', ':'))
    if '--check' in sys.argv:
        if not os.path.exists(OUT_JSON) or open(OUT_JSON).read() != s:
            sys.exit('build-explorer: assets/data/traverse.json desactualizado — correr tools/route/build-explorer.py')
        print('build-explorer: al día'); sys.exit()
    os.makedirs(os.path.dirname(OUT_JSON), exist_ok=True)
    open(OUT_JSON, 'w').write(s)
    print(f'traverse.json {len(s)//1024} KB · ' + ' · '.join(f'{n} {os.path.getsize(os.path.join(ROOT, i["src"]))//1024} KB' for n, i in data['images'].items()))
    for st in data['stages']:
        print(f"etapa {st['n']}: {st['len']} km medidos, techo {st['top']} m, piso {st['low']} m, rampa {st['steep']} %, {len(st['line'])} vértices")
