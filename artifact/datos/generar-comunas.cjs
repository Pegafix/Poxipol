const fs = require('fs');
const topo = require('topojson-client');
const c = require('./node_modules/comunas-chile-mjt/data/comunas.json');
const d = require('./node_modules/dpacl/dist/db/communes.json');
const r = require('./node_modules/dpacl/dist/db/regions.json');
const n = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z]/g, '');
const dm = new Map(d.map((x) => [n(x.name), x]));
const alias = { paiguano: 'paihuaco', rinconada: 'rinconadadelosandes', calera: 'lacalera', sanvicente: 'sanvicentedetaguatagua', marchihue: 'marchigue', mostazal: 'sanfranciscodemostazal', sanjavier: 'sanjavierdeloncomilla', negrete: 'negrele', mulchen: 'muichen', aisen: 'aysen', verde: 'lagoverde', cabodehornosexnavarino: 'cabodehornos' };
const nombreFix = { 'Paiguano': 'Paihuano', 'Calera': 'La Calera', 'Mostazal': 'Mostazal', 'Aisén': 'Aysén', 'Verde': 'Lago Verde', 'Cabo de Hornos (Ex-Navarino)': 'Cabo de Hornos', 'Marchihue': 'Marchigüe' };
const regNombre = new Map(r.map((x) => [x.id, x.name]));
const out = c.map((x) => {
  const k = n(x.name);
  const dd = dm.get(k) || dm.get(alias[k]);
  if (!dd) throw new Error('sin region ' + x.name);
  return [nombreFix[x.name] || x.name, +(+x.lat).toFixed(4), +(+x.lng).toFixed(4), dd.regionId];
});
out.push(['Alhué', -34.0333, -71.1, 7]);
for (const f of out) { if (f[0] === 'Recoleta') { f[1] = -33.4081; f[2] = -70.6392; } if (f[0] === 'Coltauco') f[1] = -34.2872; }
for (const x of ['Antártica', 'Isla de Pascua', 'Juan Fernández']) out.splice(out.findIndex((f) => f[0] === x), 1);
const regiones = Object.fromEntries(r.map((x) => [x.id, x.name]));
// lagos y ríos de Chile
const sa = require('./node_modules/sane-topojson/dist/south-america_50m.json');
const inBox = ([x, y]) => x > -76 && x < -66 && y > -56 && y < -17;
const lagos = topo.feature(sa, sa.objects.lakes).features.filter((f) => JSON.stringify(f.geometry.coordinates).match(/-7[0-5]\.\d+,-[2-5]\d\./));
const rios = topo.feature(sa, sa.objects.rivers).features;
const clip = (fc) => fc.map((f) => {
  const g = f.geometry;
  const lines = g.type === 'LineString' ? [g.coordinates] : g.type === 'MultiLineString' ? g.coordinates : g.type === 'Polygon' ? g.coordinates : g.coordinates.flat();
  return lines.filter((l) => l.some(inBox)).map((l) => l.map(([x, y]) => [+x.toFixed(3), +y.toFixed(3)]));
}).filter((l) => l.length);
const agua = { lagos: clip(lagos), rios: clip(rios) };
fs.writeFileSync('comunas.json', JSON.stringify({ regiones, comunas: out }));
fs.writeFileSync('agua.json', JSON.stringify(agua));
console.log(out.length, fs.statSync('comunas.json').size, fs.statSync('agua.json').size, agua.lagos.length, agua.rios.length);
console.log(regiones);
