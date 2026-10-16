const topo = require('topojson-client');
const fs = require('fs');
const w = JSON.parse(fs.readFileSync('node_modules/world-atlas/countries-10m.json'));
const fc = topo.feature(w, w.objects.countries);
const want = { '152': 'Chile', '032': 'Argentina', '604': 'Perú', '068': 'Bolivia' };
// Douglas-Peucker
function dp(pts, eps) {
  if (pts.length < 3) return pts;
  let max = 0, idx = 0;
  const [a, b] = [pts[0], pts[pts.length - 1]];
  for (let i = 1; i < pts.length - 1; i++) {
    const p = pts[i];
    const dx = b[0] - a[0], dy = b[1] - a[1];
    const len = Math.hypot(dx, dy) || 1e-12;
    const d = Math.abs(dy * p[0] - dx * p[1] + b[0] * a[1] - b[1] * a[0]) / len;
    if (d > max) { max = d; idx = i; }
  }
  if (max > eps) return [...dp(pts.slice(0, idx + 1), eps).slice(0, -1), ...dp(pts.slice(idx), eps)];
  return [a, b];
}
function dpRing(r, eps) {
  const m = Math.floor(r.length / 2);
  return [...dp(r.slice(0, m + 1), eps).slice(0, -1), ...dp(r.slice(m), eps)];
}
const out = [];
for (const f of fc.features) {
  if (!want[f.id]) continue;
  const eps = f.id === '152' ? 0.01 : 0.04;
  const polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
  const simp = polys.map(p => p.map(r => dpRing(r, eps).map(([x, y]) => [+x.toFixed(3), +y.toFixed(3)])).filter(r => r.length >= 4))
    .filter(p => p.length && (f.id !== '152' || true));
  // drop tiny islands far from mainland for neighbors; keep Chile all but Easter Island etc (lng < -80)
  const keep = simp.filter(p => p[0].every(([x]) => x > -80));
  out.push({ type: 'Feature', properties: { n: want[f.id] }, geometry: { type: 'MultiPolygon', coordinates: keep } });
}
fs.writeFileSync('paises.json', JSON.stringify({ type: 'FeatureCollection', features: out }));
console.log(fs.statSync('paises.json').size);
