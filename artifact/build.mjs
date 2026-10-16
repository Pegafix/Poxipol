// Genera poxipol-traslados.html (la página publicada como artifact) a partir
// de plantilla.html, incrustando el CSS de Leaflet y el mapa de Chile.
import { readFileSync, writeFileSync } from 'node:fs';

const dir = new URL('.', import.meta.url);
const leer = (f) => readFileSync(new URL(f, dir), 'utf8');

const html = leer('plantilla.html')
  .replace('/*@@LEAFLET_CSS@@*/', () => leer('datos/leaflet.css'))
  .replace('/*@@PAISES@@*/null', () => leer('datos/paises.json').trim());

writeFileSync(new URL('poxipol-traslados.html', dir), html);
console.log(`poxipol-traslados.html: ${(html.length / 1024).toFixed(0)} KB`);
