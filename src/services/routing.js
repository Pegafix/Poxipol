// Proveedores de ruteo sobre el mapa.
//
// Cada proveedor expone:
//   ruta(puntos, { alternativas })  -> [{ distanciaKm, duracionMin, geometria, tramos, fuente }]
//   matriz(puntos)                   -> { distanciasKm[][], duracionesMin[][], fuente }
//
// "osrm" usa OpenStreetMap a través de un servidor OSRM (calles reales, sentido
// del tránsito, velocidades). "estimado" funciona sin red: distancia en línea
// recta multiplicada por un factor de sinuosidad y velocidades promedio.

import { haversineKm } from './geo.js';

const FACTOR_SINUOSIDAD = 1.3;

const velocidadEstimadaKmH = (km) => (km < 15 ? 30 : km < 60 ? 55 : 80);

export function crearProveedorEstimado() {
  const tramo = (a, b) => {
    const distanciaKm = haversineKm(a, b) * FACTOR_SINUOSIDAD;
    return { distanciaKm, duracionMin: (distanciaKm / velocidadEstimadaKmH(distanciaKm)) * 60 };
  };
  return {
    nombre: 'estimado',
    async ruta(puntos) {
      const tramos = [];
      for (let i = 1; i < puntos.length; i++) tramos.push(tramo(puntos[i - 1], puntos[i]));
      return [
        {
          distanciaKm: tramos.reduce((s, t) => s + t.distanciaKm, 0),
          duracionMin: tramos.reduce((s, t) => s + t.duracionMin, 0),
          geometria: puntos.map((p) => [p.lng, p.lat]),
          tramos,
          fuente: 'estimado',
        },
      ];
    },
    async matriz(puntos) {
      const distanciasKm = puntos.map((a) => puntos.map((b) => (a === b ? 0 : tramo(a, b).distanciaKm)));
      const duracionesMin = puntos.map((a) => puntos.map((b) => (a === b ? 0 : tramo(a, b).duracionMin)));
      return { distanciasKm, duracionesMin, fuente: 'estimado' };
    },
  };
}

export function crearProveedorOSRM({ url, timeoutMs = 15000, userAgent, fetchImpl = fetch }) {
  const coords = (puntos) => puntos.map((p) => `${p.lng.toFixed(6)},${p.lat.toFixed(6)}`).join(';');

  async function pedir(path) {
    const res = await fetchImpl(`${url.replace(/\/$/, '')}${path}`, {
      headers: { 'User-Agent': userAgent || 'poxipol-traslados/1.0' },
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) throw new Error(`OSRM respondió HTTP ${res.status}`);
    const data = await res.json();
    if (data.code !== 'Ok') throw new Error(`OSRM: ${data.code} ${data.message || ''}`.trim());
    return data;
  }

  return {
    nombre: 'osrm',
    async ruta(puntos, { alternativas = false } = {}) {
      // OSRM solo calcula alternativas para rutas de 2 puntos.
      const alt = alternativas && puntos.length === 2 ? '&alternatives=3' : '';
      const data = await pedir(`/route/v1/driving/${coords(puntos)}?overview=full&geometries=geojson${alt}`);
      return data.routes.map((r) => ({
        distanciaKm: r.distance / 1000,
        duracionMin: r.duration / 60,
        geometria: r.geometry.coordinates,
        tramos: r.legs.map((l) => ({ distanciaKm: l.distance / 1000, duracionMin: l.duration / 60 })),
        fuente: 'osrm',
      }));
    },
    async matriz(puntos) {
      const data = await pedir(`/table/v1/driving/${coords(puntos)}?annotations=distance,duration`);
      return {
        distanciasKm: data.distances.map((fila) => fila.map((d) => (d == null ? Infinity : d / 1000))),
        duracionesMin: data.durations.map((fila) => fila.map((d) => (d == null ? Infinity : d / 60))),
        fuente: 'osrm',
      };
    },
  };
}

// Usa OSRM y, si no responde, cae al estimado (marcando la fuente).
export function crearProveedorAuto(opciones) {
  const osrm = crearProveedorOSRM(opciones);
  const estimado = crearProveedorEstimado();
  const conRespaldo = (metodo) => async (...args) => {
    try {
      return await osrm[metodo](...args);
    } catch (err) {
      opciones.onFallback?.(err);
      return estimado[metodo](...args);
    }
  };
  return { nombre: 'auto', ruta: conRespaldo('ruta'), matriz: conRespaldo('matriz') };
}

export function crearProveedor(tipo, opciones = {}) {
  switch (tipo) {
    case 'osrm':
      return crearProveedorOSRM(opciones);
    case 'estimado':
      return crearProveedorEstimado();
    case 'auto':
      return crearProveedorAuto(opciones);
    default:
      throw new Error(`Proveedor de rutas desconocido: ${tipo}`);
  }
}
