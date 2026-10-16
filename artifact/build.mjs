// Genera poxipol-traslados.html (la página publicada como artifact y servida
// por la API) a partir de plantilla.html, incrustando el CSS de Leaflet, el
// mapa de Chile, lagos y ríos, y las comunas.
import { readFileSync, writeFileSync } from 'node:fs';

const dir = new URL('.', import.meta.url);
const leer = (f) => readFileSync(new URL(f, dir), 'utf8');

const html = leer('plantilla.html')
  .replace('/*@@LEAFLET_CSS@@*/', () => leer('datos/leaflet.css'))
  .replace('/*@@PAISES@@*/null', () => leer('datos/paises.json').trim())
  .replace('/*@@AGUA@@*/null', () => leer('datos/agua.json').trim())
  .replace('/*@@COMUNAS@@*/null', () => leer('datos/comunas.json').trim());

if (html.includes('/*@@')) throw new Error('Quedó un marcador sin reemplazar');
writeFileSync(new URL('poxipol-traslados.html', dir), html);
console.log(`poxipol-traslados.html: ${(html.length / 1024).toFixed(0)} KB`);
