// Catálogo de modelos con sus parámetros de costo. Valores aproximados de
// mercado chileno (CLP): verifícalos y ajústalos a tu vehículo real.
//
// rendimiento*KmL     km recorridos por litro (ciudad / carretera)
// precioCompra        valor del vehículo nuevo
// valorResidualPct    % del precio que vale al final de su vida útil
// vidaUtilKm          km que se espera usarlo antes de venderlo
// mantencionPorKm     aceite, filtros, frenos, embrague, etc. ($/km)
// neumaticosPorKm     costo del juego de neumáticos / su duración en km ($/km)
// costoFijoAnual      seguro + permiso de circulación + revisión técnica ($/año)
// categoriaPeaje      categoría que paga en las plazas de peaje

export const vehiculos = [
  {
    id: 'toyota-hiace',
    marca: 'Toyota',
    modelo: 'Hiace',
    tipo: 'van',
    capacidadPasajeros: 14,
    combustible: 'diesel',
    rendimientoCiudadKmL: 9,
    rendimientoCarreteraKmL: 11.5,
    precioCompra: 33000000,
    valorResidualPct: 35,
    vidaUtilKm: 400000,
    mantencionPorKm: 45,
    neumaticosPorKm: 10,
    costoFijoAnual: 1200000,
    categoriaPeaje: 1,
  },
  {
    id: 'hyundai-staria',
    marca: 'Hyundai',
    modelo: 'Staria (H-1)',
    tipo: 'van',
    capacidadPasajeros: 11,
    combustible: 'diesel',
    rendimientoCiudadKmL: 9.5,
    rendimientoCarreteraKmL: 12,
    precioCompra: 30000000,
    valorResidualPct: 35,
    vidaUtilKm: 380000,
    mantencionPorKm: 40,
    neumaticosPorKm: 8,
    costoFijoAnual: 1100000,
    categoriaPeaje: 1,
  },
  {
    id: 'mercedes-sprinter',
    marca: 'Mercedes-Benz',
    modelo: 'Sprinter 515 Minibús',
    tipo: 'minibus',
    capacidadPasajeros: 19,
    combustible: 'diesel',
    rendimientoCiudadKmL: 7,
    rendimientoCarreteraKmL: 10,
    precioCompra: 55000000,
    valorResidualPct: 35,
    vidaUtilKm: 500000,
    mantencionPorKm: 60,
    neumaticosPorKm: 14,
    costoFijoAnual: 1800000,
    categoriaPeaje: 2,
  },
  {
    id: 'peugeot-boxer',
    marca: 'Peugeot',
    modelo: 'Boxer Minibús',
    tipo: 'minibus',
    capacidadPasajeros: 16,
    combustible: 'diesel',
    rendimientoCiudadKmL: 8,
    rendimientoCarreteraKmL: 10.5,
    precioCompra: 38000000,
    valorResidualPct: 30,
    vidaUtilKm: 400000,
    mantencionPorKm: 50,
    neumaticosPorKm: 12,
    costoFijoAnual: 1400000,
    categoriaPeaje: 2,
  },
  {
    id: 'ford-transit',
    marca: 'Ford',
    modelo: 'Transit Minibús',
    tipo: 'minibus',
    capacidadPasajeros: 15,
    combustible: 'diesel',
    rendimientoCiudadKmL: 8,
    rendimientoCarreteraKmL: 11,
    precioCompra: 40000000,
    valorResidualPct: 30,
    vidaUtilKm: 400000,
    mantencionPorKm: 50,
    neumaticosPorKm: 12,
    costoFijoAnual: 1400000,
    categoriaPeaje: 2,
  },
  {
    id: 'renault-master',
    marca: 'Renault',
    modelo: 'Master Minibús',
    tipo: 'minibus',
    capacidadPasajeros: 16,
    combustible: 'diesel',
    rendimientoCiudadKmL: 8,
    rendimientoCarreteraKmL: 11,
    precioCompra: 36000000,
    valorResidualPct: 30,
    vidaUtilKm: 400000,
    mantencionPorKm: 48,
    neumaticosPorKm: 12,
    costoFijoAnual: 1350000,
    categoriaPeaje: 2,
  },
  {
    id: 'maxus-v80',
    marca: 'Maxus',
    modelo: 'V80',
    tipo: 'van',
    capacidadPasajeros: 15,
    combustible: 'diesel',
    rendimientoCiudadKmL: 8,
    rendimientoCarreteraKmL: 11,
    precioCompra: 26000000,
    valorResidualPct: 25,
    vidaUtilKm: 350000,
    mantencionPorKm: 45,
    neumaticosPorKm: 11,
    costoFijoAnual: 1150000,
    categoriaPeaje: 1,
  },
  {
    id: 'mercedes-vito',
    marca: 'Mercedes-Benz',
    modelo: 'Vito Tourer',
    tipo: 'van',
    capacidadPasajeros: 8,
    combustible: 'diesel',
    rendimientoCiudadKmL: 10,
    rendimientoCarreteraKmL: 13,
    precioCompra: 42000000,
    valorResidualPct: 40,
    vidaUtilKm: 400000,
    mantencionPorKm: 50,
    neumaticosPorKm: 9,
    costoFijoAnual: 1400000,
    categoriaPeaje: 1,
  },
  {
    id: 'kia-carnival',
    marca: 'Kia',
    modelo: 'Carnival',
    tipo: 'van',
    capacidadPasajeros: 7,
    combustible: 'diesel',
    rendimientoCiudadKmL: 10,
    rendimientoCarreteraKmL: 14,
    precioCompra: 32000000,
    valorResidualPct: 40,
    vidaUtilKm: 350000,
    mantencionPorKm: 38,
    neumaticosPorKm: 8,
    costoFijoAnual: 1100000,
    categoriaPeaje: 1,
  },
  {
    id: 'chevrolet-n400',
    marca: 'Chevrolet',
    modelo: 'N400 Max',
    tipo: 'van',
    capacidadPasajeros: 7,
    combustible: 'gasolina',
    rendimientoCiudadKmL: 10,
    rendimientoCarreteraKmL: 13,
    precioCompra: 13000000,
    valorResidualPct: 30,
    vidaUtilKm: 250000,
    mantencionPorKm: 30,
    neumaticosPorKm: 6,
    costoFijoAnual: 650000,
    categoriaPeaje: 1,
  },
  {
    id: 'toyota-corolla',
    marca: 'Toyota',
    modelo: 'Corolla',
    tipo: 'sedan',
    capacidadPasajeros: 4,
    combustible: 'gasolina',
    rendimientoCiudadKmL: 12,
    rendimientoCarreteraKmL: 17,
    precioCompra: 20000000,
    valorResidualPct: 45,
    vidaUtilKm: 350000,
    mantencionPorKm: 25,
    neumaticosPorKm: 6,
    costoFijoAnual: 800000,
    categoriaPeaje: 1,
  },
  {
    id: 'toyota-corolla-hybrid',
    marca: 'Toyota',
    modelo: 'Corolla Hybrid',
    tipo: 'sedan',
    capacidadPasajeros: 4,
    combustible: 'gasolina',
    rendimientoCiudadKmL: 22,
    rendimientoCarreteraKmL: 20,
    precioCompra: 25000000,
    valorResidualPct: 45,
    vidaUtilKm: 350000,
    mantencionPorKm: 22,
    neumaticosPorKm: 6,
    costoFijoAnual: 900000,
    categoriaPeaje: 1,
  },
  {
    id: 'hyundai-accent',
    marca: 'Hyundai',
    modelo: 'Accent',
    tipo: 'sedan',
    capacidadPasajeros: 4,
    combustible: 'gasolina',
    rendimientoCiudadKmL: 13,
    rendimientoCarreteraKmL: 19,
    precioCompra: 14000000,
    valorResidualPct: 40,
    vidaUtilKm: 300000,
    mantencionPorKm: 22,
    neumaticosPorKm: 5,
    costoFijoAnual: 650000,
    categoriaPeaje: 1,
  },
  {
    id: 'nissan-versa',
    marca: 'Nissan',
    modelo: 'Versa',
    tipo: 'sedan',
    capacidadPasajeros: 4,
    combustible: 'gasolina',
    rendimientoCiudadKmL: 13,
    rendimientoCarreteraKmL: 18,
    precioCompra: 13500000,
    valorResidualPct: 40,
    vidaUtilKm: 300000,
    mantencionPorKm: 22,
    neumaticosPorKm: 5,
    costoFijoAnual: 650000,
    categoriaPeaje: 1,
  },
  {
    id: 'chevrolet-sail',
    marca: 'Chevrolet',
    modelo: 'Sail',
    tipo: 'sedan',
    capacidadPasajeros: 4,
    combustible: 'gasolina',
    rendimientoCiudadKmL: 13,
    rendimientoCarreteraKmL: 18,
    precioCompra: 11000000,
    valorResidualPct: 35,
    vidaUtilKm: 280000,
    mantencionPorKm: 20,
    neumaticosPorKm: 5,
    costoFijoAnual: 600000,
    categoriaPeaje: 1,
  },
  {
    id: 'suzuki-dzire',
    marca: 'Suzuki',
    modelo: 'Dzire',
    tipo: 'sedan',
    capacidadPasajeros: 4,
    combustible: 'gasolina',
    rendimientoCiudadKmL: 15,
    rendimientoCarreteraKmL: 21,
    precioCompra: 10500000,
    valorResidualPct: 35,
    vidaUtilKm: 280000,
    mantencionPorKm: 20,
    neumaticosPorKm: 5,
    costoFijoAnual: 600000,
    categoriaPeaje: 1,
  },
];

const CAMPOS_NUMERICOS = [
  'capacidadPasajeros',
  'rendimientoCiudadKmL',
  'rendimientoCarreteraKmL',
  'precioCompra',
  'valorResidualPct',
  'vidaUtilKm',
  'mantencionPorKm',
  'neumaticosPorKm',
  'costoFijoAnual',
  'categoriaPeaje',
];

export const normalizar = (s) =>
  String(s)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const textoBusqueda = (v) => normalizar(`${v.id} ${v.marca} ${v.modelo} ${v.tipo}`);

// Devuelve los modelos que coinciden con el texto, mejor coincidencia primero.
export function buscarVehiculos(texto) {
  if (!texto) return [...vehiculos];
  const tokens = normalizar(texto).split(' ').filter(Boolean);
  return vehiculos
    .map((v) => {
      const hay = textoBusqueda(v);
      const coinciden = tokens.filter((t) => hay.includes(t)).length;
      return { v, score: coinciden / tokens.length };
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((r) => r.v);
}

export function obtenerVehiculo(id) {
  return vehiculos.find((v) => v.id === id) || null;
}

// Resuelve el vehículo del request. Acepta:
//  - "toyota-hiace" o "Toyota Hiace" (busca en el catálogo)
//  - { modelo: "Toyota Hiace", rendimientoCarreteraKmL: 12 } (catálogo + ajustes)
//  - { modelo: "Mi furgón", combustible: "diesel", ...todos los campos } (personalizado)
export function resolverVehiculo(entrada) {
  if (!entrada) throw errorVehiculo('Debes indicar el modelo del vehículo (campo "vehiculo").');

  const pedido = typeof entrada === 'string' ? { modelo: entrada } : { ...entrada };
  const clave = pedido.id || pedido.modelo;

  let base = null;
  if (clave) {
    base = obtenerVehiculo(clave);
    if (!base) {
      const encontrados = buscarVehiculos(clave);
      // Solo se acepta si la coincidencia es completa (todas las palabras).
      const tokens = normalizar(clave).split(' ').filter(Boolean);
      const nombre = (v) => normalizar(`${v.id} ${v.marca} ${v.modelo}`);
      const exacto = encontrados.find((v) => tokens.every((t) => nombre(v).includes(t)));
      if (exacto) {
        base = exacto;
      }
    }
  }

  const ajustes = {};
  for (const campo of CAMPOS_NUMERICOS) {
    if (pedido[campo] !== undefined) {
      const n = Number(pedido[campo]);
      if (!Number.isFinite(n) || n < 0) throw errorVehiculo(`El campo vehiculo.${campo} debe ser un número >= 0.`);
      ajustes[campo] = n;
    }
  }
  if (pedido.combustible !== undefined) ajustes.combustible = pedido.combustible;

  const vehiculo = base
    ? { ...base, ...ajustes, personalizado: Object.keys(ajustes).length > 0 }
    : { id: 'personalizado', marca: '', modelo: clave || 'Personalizado', tipo: 'personalizado', ...ajustes, personalizado: true };

  const faltan = [...CAMPOS_NUMERICOS, 'combustible'].filter((c) => vehiculo[c] === undefined);
  if (faltan.length) {
    const sugerencias = clave ? buscarVehiculos(clave).slice(0, 5).map((v) => `${v.id} (${v.marca} ${v.modelo})`) : [];
    const err = errorVehiculo(
      `Modelo "${clave}" no está en el catálogo. Elige uno de GET /api/vehiculos o envía los datos completos ` +
        `del vehículo. Faltan: ${faltan.join(', ')}.`,
    );
    err.detalles = { sugerencias };
    throw err;
  }
  if (!['gasolina', 'diesel'].includes(vehiculo.combustible)) {
    throw errorVehiculo('vehiculo.combustible debe ser "gasolina" o "diesel".');
  }
  if (vehiculo.rendimientoCiudadKmL <= 0 || vehiculo.rendimientoCarreteraKmL <= 0) {
    throw errorVehiculo('El rendimiento del vehículo debe ser mayor que 0.');
  }
  return vehiculo;
}

function errorVehiculo(msg) {
  const err = new Error(msg);
  err.status = 400;
  return err;
}
