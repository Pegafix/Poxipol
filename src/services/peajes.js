import { bbox, distanciaPuntoLineaKm } from './geo.js';

// Plazas de peaje por las que pasa la geometría, con el monto según categoría.
export function detectarPeajes(geometria, plazas, { categoria, radioKm }) {
  if (!geometria?.length) return [];
  const caja = bbox(geometria);
  const margenGrados = radioKm / 100; // ~1 km por 0.01°, holgado para el prefiltro
  return plazas
    .filter(
      (p) =>
        p.lat >= caja.minLat - margenGrados &&
        p.lat <= caja.maxLat + margenGrados &&
        p.lng >= caja.minLng - margenGrados &&
        p.lng <= caja.maxLng + margenGrados,
    )
    .filter((p) => distanciaPuntoLineaKm(p, geometria) <= radioKm)
    .map((p) => ({
      id: p.id,
      nombre: p.nombre,
      categoria,
      monto: p.tarifas[categoria] ?? p.tarifas[1] ?? 0,
      verificado: p.verificado,
      origen: 'automatico',
    }));
}
