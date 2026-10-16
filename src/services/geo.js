// Utilidades geográficas. Puntos internos: { lat, lng }.
// Geometrías: arreglos GeoJSON [lng, lat].

const R_TIERRA_KM = 6371;
const rad = (g) => (g * Math.PI) / 180;

export function haversineKm(a, b) {
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R_TIERRA_KM * Math.asin(Math.sqrt(h));
}

// Distancia (km) de un punto a un segmento, con proyección equirectangular
// local (precisa a escala de cientos de metros, que es lo que necesitamos).
function distanciaPuntoSegmentoKm(p, a, b) {
  const kx = R_TIERRA_KM * rad(1) * Math.cos(rad(p.lat));
  const ky = R_TIERRA_KM * rad(1);
  const ax = (a.lng - p.lng) * kx;
  const ay = (a.lat - p.lat) * ky;
  const bx = (b.lng - p.lng) * kx;
  const by = (b.lat - p.lat) * ky;
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, -(ax * dx + ay * dy) / len2));
  return Math.hypot(ax + t * dx, ay + t * dy);
}

// Distancia mínima (km) entre un punto y una polilínea GeoJSON.
export function distanciaPuntoLineaKm(p, coords) {
  if (coords.length === 1) return haversineKm(p, { lng: coords[0][0], lat: coords[0][1] });
  let min = Infinity;
  for (let i = 1; i < coords.length; i++) {
    const a = { lng: coords[i - 1][0], lat: coords[i - 1][1] };
    const b = { lng: coords[i][0], lat: coords[i][1] };
    min = Math.min(min, distanciaPuntoSegmentoKm(p, a, b));
  }
  return min;
}

export function bbox(coords) {
  let [minLng, minLat, maxLng, maxLat] = [Infinity, Infinity, -Infinity, -Infinity];
  for (const [lng, lat] of coords) {
    minLng = Math.min(minLng, lng);
    minLat = Math.min(minLat, lat);
    maxLng = Math.max(maxLng, lng);
    maxLat = Math.max(maxLat, lat);
  }
  return { minLng, minLat, maxLng, maxLat };
}

// Punto desplazado perpendicularmente desde el punto medio de a-b. `fraccion`
// es la proporción de la distancia a-b (positiva a la izquierda).
export function puntoDesvio(a, b, fraccion) {
  const mid = { lat: (a.lat + b.lat) / 2, lng: (a.lng + b.lng) / 2 };
  const cos = Math.cos(rad(mid.lat));
  const dx = (b.lng - a.lng) * cos;
  const dy = b.lat - a.lat;
  return { lat: mid.lat + dx * fraccion, lng: mid.lng - (dy * fraccion) / cos };
}

export const aGeoJSON = (p) => [p.lng, p.lat];
