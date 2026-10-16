// Plazas de peaje troncales. La ruta "paga" una plaza cuando su trazado pasa a
// menos de `radioDeteccionPeajeKm` de las coordenadas de la plaza.
//
// IMPORTANTE: coordenadas y tarifas son REFERENCIALES (aprox.). Antes de usar
// en producción verifícalas con las tarifas vigentes de cada concesionaria y
// carga las tuyas con POST /api/peajes o editando este archivo. Las autopistas
// urbanas con TAG (free-flow) no están incluidas: agrégalas con
// `peajesManuales` en la cotización.
//
// tarifas: monto por pasada según categoría del vehículo
//   1 = autos, camionetas y vans   2 = buses/minibuses 2 ejes   3 = buses/camiones +2 ejes

let siguienteId = 1;
const conId = (p) => ({ id: siguienteId++, verificado: false, ...p });

export const peajes = [
  conId({ nombre: 'Lo Prado (Ruta 68)', lat: -33.4469, lng: -70.9256, tarifas: { 1: 2700, 2: 4900, 3: 8600 } }),
  conId({ nombre: 'Zapata (Ruta 68)', lat: -33.3416, lng: -71.3825, tarifas: { 1: 3700, 2: 6700, 3: 11900 } }),
  conId({ nombre: 'Angostura (Ruta 5 Sur)', lat: -33.9083, lng: -70.7307, tarifas: { 1: 3400, 2: 6100, 3: 10900 } }),
  conId({ nombre: 'Las Vegas (Ruta 5 Norte)', lat: -32.8337, lng: -70.9946, tarifas: { 1: 3300, 2: 6000, 3: 10600 } }),
];

export function agregarPeaje({ nombre, lat, lng, tarifas }) {
  const errores = [];
  if (!nombre || typeof nombre !== 'string') errores.push('nombre es obligatorio');
  if (!Number.isFinite(Number(lat)) || Math.abs(lat) > 90) errores.push('lat inválida');
  if (!Number.isFinite(Number(lng)) || Math.abs(lng) > 180) errores.push('lng inválida');
  if (!tarifas || typeof tarifas !== 'object' || !Object.values(tarifas).every((t) => Number(t) >= 0)) {
    errores.push('tarifas debe ser un objeto { "1": monto, "2": monto, ... }');
  }
  if (errores.length) {
    const err = new Error(`Peaje inválido: ${errores.join('; ')}.`);
    err.status = 400;
    throw err;
  }
  const tarifasNum = Object.fromEntries(Object.entries(tarifas).map(([k, v]) => [k, Number(v)]));
  const peaje = { id: siguienteId++, nombre, lat: Number(lat), lng: Number(lng), tarifas: tarifasNum, verificado: true };
  peajes.push(peaje);
  return peaje;
}

export function eliminarPeaje(id) {
  const i = peajes.findIndex((p) => p.id === Number(id));
  if (i === -1) return false;
  peajes.splice(i, 1);
  return true;
}
