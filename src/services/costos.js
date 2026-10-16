// Cálculo de costos y tarifa sugerida de un traslado.
//
// Costo real del viaje (punto de equilibrio) =
//     combustible + peajes + desgaste (depreciación + mantención + neumáticos)
//   + tiempo del conductor (manejo, paradas y espera) + costos fijos prorrateados
//   + imprevistos
// Precio sugerido = costo + margen de ganancia + recargo por paradas (+ IVA)

const r = (n) => Math.round(n);
const r2 = (n) => Math.round(n * 100) / 100;

// Rendimiento según velocidad promedio: tráfico urbano (<=30 km/h) usa el
// rendimiento en ciudad, carretera (>=80 km/h) el de carretera; entre ambos se
// interpola.
export function rendimientoKmL(vehiculo, velocidadKmH) {
  const { rendimientoCiudadKmL: ciudad, rendimientoCarreteraKmL: carretera } = vehiculo;
  if (!Number.isFinite(velocidadKmH) || velocidadKmH <= 30) return ciudad;
  if (velocidadKmH >= 80) return carretera;
  return ciudad + ((carretera - ciudad) * (velocidadKmH - 30)) / 50;
}

export function costoDesgastePorKm(vehiculo) {
  const depreciacion = (vehiculo.precioCompra * (1 - vehiculo.valorResidualPct / 100)) / vehiculo.vidaUtilKm;
  return {
    depreciacion,
    mantencion: vehiculo.mantencionPorKm,
    neumaticos: vehiculo.neumaticosPorKm,
    total: depreciacion + vehiculo.mantencionPorKm + vehiculo.neumaticosPorKm,
  };
}

// recorridos: [{ concepto, km, min, peajes: [{ nombre, monto }], factor, ocupacion }]
//   factor    fracción que se cobra de ese recorrido (1 = completo; retorno vacío parcial < 1)
//   ocupacion pasajeros promedio a bordo (afecta el consumo)
export function calcularTarifa({ vehiculo, params, pasajeros, recorridos, numParadas = 0, minutosParadas = 0, esperaMin = 0 }) {
  const precioLitro = params.precioCombustible[vehiculo.combustible];
  if (!Number.isFinite(precioLitro)) throw Object.assign(new Error(`Sin precio para ${vehiculo.combustible}.`), { status: 400 });
  const desgasteKm = costoDesgastePorKm(vehiculo);

  let km = 0;
  let minManejo = 0;
  let litros = 0;
  let peajesTotal = 0;
  const peajesDetalle = [];
  const detalleRecorridos = recorridos.map((rec) => {
    const f = rec.factor ?? 1;
    const velocidad = rec.min > 0 ? rec.km / (rec.min / 60) : NaN;
    const rendimiento = rendimientoKmL(vehiculo, velocidad);
    const ocupacionPct = Math.min(1, (rec.ocupacion ?? 0) / vehiculo.capacidadPasajeros);
    const factorCarga = 1 + (params.factorCargaMaxPct / 100) * ocupacionPct;
    const litrosRec = (rec.km / rendimiento) * factorCarga * f;
    const peajesRec = rec.peajes.reduce((s, p) => s + p.monto, 0) * f;

    km += rec.km * f;
    minManejo += rec.min * f;
    litros += litrosRec;
    peajesTotal += peajesRec;
    for (const p of rec.peajes) peajesDetalle.push({ recorrido: rec.concepto, ...p, montoCobrado: r(p.monto * f) });

    return {
      concepto: rec.concepto,
      distanciaKm: r2(rec.km),
      duracionMin: r(rec.min),
      porcentajeCobrado: r(f * 100),
      velocidadPromedioKmH: Number.isFinite(velocidad) ? r(velocidad) : null,
      rendimientoKmL: r2(rendimiento / factorCarga),
      litros: r2(litrosRec),
      combustible: r(litrosRec * precioLitro),
      peajes: r(peajesRec),
      desgaste: r(rec.km * f * desgasteKm.total),
    };
  });

  const combustible = litros * precioLitro;
  const desgaste = {
    depreciacion: km * desgasteKm.depreciacion,
    mantencion: km * desgasteKm.mantencion,
    neumaticos: km * desgasteKm.neumaticos,
  };
  const desgasteTotal = desgaste.depreciacion + desgaste.mantencion + desgaste.neumaticos;

  // Tiempo: manejo + paradas a velocidad normal; la espera tiene su propia tarifa.
  const minTrabajo = minManejo + minutosParadas;
  const minTotal = minTrabajo + esperaMin;
  const minMinimoExtra = Math.max(0, params.tiempoMinimoCobroMin - minTotal);
  const conductor =
    ((minTrabajo + minMinimoExtra) / 60) * params.valorHoraConductor + (esperaMin / 60) * params.valorHoraEspera;
  const horasCobradas = (minTotal + minMinimoExtra) / 60;
  const fijos = horasCobradas * (vehiculo.costoFijoAnual / params.horasOperativasAnuales);

  const subtotal = combustible + peajesTotal + desgasteTotal + conductor + fijos;
  const imprevistos = subtotal * (params.imprevistosPct / 100);
  const costoTotal = subtotal + imprevistos;
  const margen = costoTotal * (params.margenGananciaPct / 100);
  const recargoParadas = numParadas * params.recargoPorParada;
  const precioNeto = costoTotal + margen + recargoParadas;
  const iva = params.incluirIVA ? precioNeto * (params.ivaPct / 100) : 0;
  const redondeo = params.redondeo > 0 ? params.redondeo : 1;
  const precioFinal = Math.ceil((precioNeto + iva) / redondeo) * redondeo;
  const pax = Math.max(1, pasajeros);

  return {
    moneda: params.moneda,
    distanciaTotalKm: r2(km),
    tiempo: {
      manejoMin: r(minManejo),
      paradasMin: r(minutosParadas),
      esperaMin: r(esperaMin),
      minimoCobradoExtraMin: r(minMinimoExtra),
      totalCobradoMin: r(minTotal + minMinimoExtra),
    },
    combustible: {
      tipo: vehiculo.combustible,
      precioLitro,
      litros: r2(litros),
      monto: r(combustible),
    },
    peajes: { monto: r(peajesTotal), detalle: peajesDetalle },
    desgaste: {
      depreciacion: r(desgaste.depreciacion),
      mantencion: r(desgaste.mantencion),
      neumaticos: r(desgaste.neumaticos),
      monto: r(desgasteTotal),
      porKm: r2(desgasteKm.total),
    },
    conductor: { valorHora: params.valorHoraConductor, valorHoraEspera: params.valorHoraEspera, monto: r(conductor) },
    costosFijos: { monto: r(fijos), porHora: r(vehiculo.costoFijoAnual / params.horasOperativasAnuales) },
    imprevistos: { porcentaje: params.imprevistosPct, monto: r(imprevistos) },
    costoTotal: r(costoTotal),
    margen: { porcentaje: params.margenGananciaPct, monto: r(margen) },
    recargoParadas: { paradas: numParadas, valorPorParada: params.recargoPorParada, monto: r(recargoParadas) },
    precioNeto: r(precioNeto),
    iva: { incluido: params.incluirIVA, porcentaje: params.ivaPct, monto: r(iva) },
    precioFinal,
    gananciaEstimada: r(precioFinal - iva - costoTotal),
    precioMinimoSinPerdida: r(costoTotal * (params.incluirIVA ? 1 + params.ivaPct / 100 : 1)),
    precioPorPasajero: Math.ceil(precioFinal / pax),
    precioPorKm: km > 0 ? r(precioFinal / km) : null,
    recorridos: detalleRecorridos,
  };
}
