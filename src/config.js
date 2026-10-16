// Parámetros por defecto de la API. Todos se pueden sobrescribir por variable
// de entorno o, por cotización, con el objeto `parametros` del request.
// Los valores monetarios están en pesos chilenos (CLP) y son referenciales:
// ajústalos a tus precios reales.

const num = (name, fallback) => {
  const v = process.env[name];
  if (v === undefined || v === '') return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

export const config = {
  port: num('PORT', 3000),

  // Proveedor de rutas: "osrm" (mapa real, OpenStreetMap), "estimado" (sin red,
  // distancia en línea recta corregida) o "auto" (OSRM y si falla, estimado).
  routingProvider: process.env.ROUTING_PROVIDER || 'auto',
  osrmUrl: process.env.OSRM_URL || 'https://router.project-osrm.org',
  nominatimUrl: process.env.NOMINATIM_URL || 'https://nominatim.openstreetmap.org',
  userAgent: process.env.HTTP_USER_AGENT || 'poxipol-traslados/1.0',
  httpTimeoutMs: num('HTTP_TIMEOUT_MS', 15000),

  // Radio (km) para considerar que una ruta pasa por una plaza de peaje.
  radioDeteccionPeajeKm: num('RADIO_PEAJE_KM', 0.3),

  tarifa: {
    moneda: process.env.MONEDA || 'CLP',
    precioCombustible: {
      gasolina: num('PRECIO_GASOLINA', 1290), // $/litro (93 octanos)
      diesel: num('PRECIO_DIESEL', 990), // $/litro
    },
    valorHoraConductor: num('VALOR_HORA_CONDUCTOR', 6000), // $/hora manejando
    valorHoraEspera: num('VALOR_HORA_ESPERA', 4500), // $/hora esperando (ida y vuelta)
    minutosPorParada: num('MINUTOS_POR_PARADA', 5), // bajada de pasajeros/equipaje
    recargoPorParada: num('RECARGO_POR_PARADA', 2000), // $ fijo por cada parada extra
    tiempoMinimoCobroMin: num('TIEMPO_MINIMO_COBRO_MIN', 60), // se cobra al menos 1 hora
    horasOperativasAnuales: num('HORAS_OPERATIVAS_ANUALES', 2000), // para prorratear costos fijos
    factorCargaMaxPct: num('FACTOR_CARGA_MAX_PCT', 8), // + consumo con el vehículo lleno
    imprevistosPct: num('IMPREVISTOS_PCT', 5), // colchón sobre el costo
    margenGananciaPct: num('MARGEN_GANANCIA_PCT', 25), // utilidad sobre el costo
    porcentajeRetornoVacio: num('PORCENTAJE_RETORNO_VACIO', 0), // % del regreso vacío que se cobra en "solo ida"
    incluirIVA: process.env.INCLUIR_IVA === 'true',
    ivaPct: num('IVA_PCT', 19),
    redondeo: num('REDONDEO', 500), // el precio final se redondea hacia arriba a este múltiplo
  },
};
