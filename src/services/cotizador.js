// Orquesta una cotización: resuelve ubicaciones y vehículo, genera al menos 3
// rutas sobre el mapa, detecta peajes y calcula la tarifa de "solo ida" y de
// "ida y vuelta" para cada ruta, con el desglose por pasajero/parada.

import { resolverVehiculo, vehiculos } from '../data/vehiculos.js';
import { calcularTarifa } from './costos.js';
import { detectarPeajes } from './peajes.js';
import { mejoresOrdenes } from './optimizador.js';
import { puntoDesvio } from './geo.js';

const MIN_RUTAS = 3;
const FRACCIONES_DESVIO = [0.15, -0.15, 0.3, -0.3, 0.45, -0.45];
const TIPOS_VIAJE = ['ida', 'ida_vuelta'];

const errorPeticion = (msg, detalles) => Object.assign(new Error(msg), { status: 400, detalles });
const r = (n) => Math.round(n);
const r2 = (n) => Math.round(n * 100) / 100;

const PARAMETROS_NUMERICOS = [
  'valorHoraConductor',
  'valorHoraEspera',
  'minutosPorParada',
  'recargoPorParada',
  'tiempoMinimoCobroMin',
  'horasOperativasAnuales',
  'factorCargaMaxPct',
  'imprevistosPct',
  'margenGananciaPct',
  'porcentajeRetornoVacio',
  'ivaPct',
  'redondeo',
];

export function combinarParametros(base, extra = {}) {
  const params = { ...base, precioCombustible: { ...base.precioCombustible } };
  for (const campo of PARAMETROS_NUMERICOS) {
    if (extra[campo] === undefined) continue;
    const n = Number(extra[campo]);
    if (!Number.isFinite(n) || n < 0) throw errorPeticion(`parametros.${campo} debe ser un número >= 0.`);
    params[campo] = n;
  }
  if (params.porcentajeRetornoVacio > 100) throw errorPeticion('parametros.porcentajeRetornoVacio debe estar entre 0 y 100.');
  if (params.horasOperativasAnuales <= 0) throw errorPeticion('parametros.horasOperativasAnuales debe ser mayor que 0.');
  if (extra.incluirIVA !== undefined) params.incluirIVA = Boolean(extra.incluirIVA);
  if (extra.moneda) params.moneda = String(extra.moneda);
  for (const [tipo, precio] of Object.entries(extra.precioCombustible || {})) {
    const n = Number(precio);
    if (!Number.isFinite(n) || n <= 0) throw errorPeticion(`parametros.precioCombustible.${tipo} debe ser mayor que 0.`);
    params.precioCombustible[tipo] = n;
  }
  return params;
}

const claveRuta = (ruta) => `${r(ruta.distanciaKm * 10)}|${r(ruta.duracionMin)}`;

// Dos rutas se consideran iguales si difieren en menos de 0,5 % de distancia y 1 minuto.
const esDuplicada = (ruta, lista) =>
  lista.some(
    (o) =>
      Math.abs(o.distanciaKm - ruta.distanciaKm) <= Math.max(0.05, ruta.distanciaKm * 0.005) &&
      Math.abs(o.duracionMin - ruta.duracionMin) < 1,
  );

export function crearCotizador({ proveedor, geocodificar, plazasPeaje, config }) {
  // Pide una ruta con un punto intermedio de desvío en el tramo más largo y
  // vuelve a juntar los dos sub-tramos para que los tramos sigan alineados
  // con las paradas.
  async function rutaConDesvio(puntos, base, fraccion) {
    let largo = 0;
    base.tramos.forEach((t, i) => {
      if (t.distanciaKm > base.tramos[largo].distanciaKm) largo = i;
    });
    const via = puntoDesvio(puntos[largo], puntos[largo + 1], fraccion);
    const conVia = [...puntos.slice(0, largo + 1), via, ...puntos.slice(largo + 1)];
    const [ruta] = await proveedor.ruta(conVia);
    const tramos = [...ruta.tramos];
    const [a, b] = tramos.splice(largo, 2);
    tramos.splice(largo, 0, { distanciaKm: a.distanciaKm + b.distanciaKm, duracionMin: a.duracionMin + b.duracionMin });
    return { ...ruta, tramos };
  }

  // Genera las rutas candidatas de ida. Cada una trae el orden de los puntos.
  async function generarRutas(origen, paradas, destino, optimizar, advertencias) {
    const candidatos = [];
    const agregar = (ruta, orden, nombre) => {
      if (candidatos.length >= MIN_RUTAS || esDuplicada(ruta, candidatos)) return;
      candidatos.push({ ...ruta, orden, nombre });
    };
    const puntosDe = (orden) => [origen, ...orden.map((i) => paradas[i]), ...(destino ? [destino] : [])];

    const ordenIngresado = paradas.map((_, i) => i);
    const ordenes = [];
    if (paradas.length <= 1 || !optimizar) {
      ordenes.push({ orden: ordenIngresado, nombre: 'Ruta directa' });
    } else {
      // Matriz de distancias/tiempos entre todos los puntos (0 = origen).
      const puntos = puntosDe(ordenIngresado);
      const { distanciasKm, duracionesMin } = await proveedor.matriz(puntos);
      const idxParadas = paradas.map((_, i) => i + 1);
      const fin = destino ? puntos.length - 1 : null;
      const porDistancia = mejoresOrdenes(distanciasKm, { paradas: idxParadas, fin, k: 3 });
      const [porTiempo] = mejoresOrdenes(duracionesMin, { paradas: idxParadas, fin, k: 1 });
      const aOrden = (o) => o.orden.map((i) => i - 1);
      ordenes.push({ orden: aOrden(porDistancia[0]), nombre: 'Paradas en orden óptimo (menor distancia)' });
      ordenes.push({ orden: aOrden(porTiempo), nombre: 'Paradas en orden más rápido (menor tiempo)' });
      ordenes.push({ orden: ordenIngresado, nombre: 'Paradas en el orden ingresado' });
      porDistancia.slice(1).forEach((o, i) => ordenes.push({ orden: aOrden(o), nombre: `Orden alternativo ${i + 2}` }));
    }

    const vistos = new Set();
    for (const { orden, nombre } of ordenes) {
      const clave = orden.join(',');
      if (vistos.has(clave)) continue;
      vistos.add(clave);
      const rutas = await proveedor.ruta(puntosDe(orden), { alternativas: true });
      rutas.forEach((ruta, i) => agregar(ruta, orden, i === 0 ? nombre : `${nombre} · alternativa ${i}`));
    }

    // Si el mapa no entregó 3 rutas distintas, se fuerzan desvíos por caminos alternativos.
    const base = candidatos[0];
    for (const fraccion of FRACCIONES_DESVIO) {
      if (candidatos.length >= MIN_RUTAS) break;
      try {
        const ruta = await rutaConDesvio(puntosDe(base.orden), base, fraccion);
        agregar(ruta, base.orden, `${base.nombre} · desvío alternativo ${candidatos.length}`);
      } catch {
        // un desvío que no se puede rutear simplemente se descarta
      }
    }
    if (candidatos.length < MIN_RUTAS) {
      advertencias.push(`Solo se encontraron ${candidatos.length} rutas distintas para este trayecto.`);
    }
    return candidatos;
  }

  // Reparte el precio entre los grupos de pasajeros: el costo de cada tramo se
  // divide entre los pasajeros que van a bordo en ese tramo.
  function desglosarPasajeros({ puntosRuta, grupos, tramos, tarifaIda, precioFinal, pasajeros }) {
    const totalKm = tramos.reduce((s, t) => s + t.distanciaKm, 0) || 1;
    const totalMin = tramos.reduce((s, t) => s + t.duracionMin, 0) || 1;
    const costoKm = tarifaIda.combustible.monto + tarifaIda.peajes.monto + tarifaIda.desgaste.monto;
    const costoTiempo = tarifaIda.conductor.monto + tarifaIda.costosFijos.monto;

    const grupoPorPunto = puntosRuta.map((p) => grupos.find((g) => g.punto === p) || null);
    const pesos = grupoPorPunto.map(() => 0);
    const kmABordo = grupoPorPunto.map(() => 0);
    // Tramos sin pasajeros a bordo (p. ej. destino final sin bajadas) quedan
    // repartidos en proporción al resto al normalizar.
    let aBordo = pasajeros;
    tramos.forEach((t, j) => {
      const peso = (costoKm * t.distanciaKm) / totalKm + (costoTiempo * t.duracionMin) / totalMin;
      for (let p = j + 1; p < puntosRuta.length; p++) {
        const g = grupoPorPunto[p];
        if (!g || aBordo <= 0) continue;
        pesos[p] += (peso * g.pasajeros) / aBordo;
        kmABordo[p] += t.distanciaKm;
      }
      aBordo -= grupoPorPunto[j + 1]?.pasajeros || 0;
    });

    const suma = pesos.reduce((s, x) => s + x, 0) || 1;
    const filas = [];
    let asignado = 0;
    grupoPorPunto.forEach((g, p) => {
      if (!g) return;
      const proporcion = pesos[p] / suma;
      filas.push({
        orden: p,
        nombre: g.punto.nombre,
        pasajeros: g.pasajeros,
        kmABordo: r2(kmABordo[p]),
        porcentaje: r2(proporcion * 100),
        montoGrupo: r(precioFinal * proporcion),
        montoPorPasajero: Math.ceil((precioFinal * proporcion) / g.pasajeros),
      });
      asignado += r(precioFinal * proporcion);
    });
    // Ajuste de redondeo para que la suma de los grupos sea exactamente el precio final.
    if (filas.length) filas[filas.length - 1].montoGrupo += precioFinal - asignado;
    return filas;
  }

  // Rutas sobre el mapa real para la app interactiva. Los puntos llegan ya en
  // el orden de visita; los costos los calcula la app.
  async function rutasMapa(puntosIn, categoria = 1) {
    if (!Array.isArray(puntosIn) || puntosIn.length < 2) throw errorPeticion('Envía al menos 2 puntos en "puntos".');
    if (puntosIn.length > 12) throw errorPeticion('Máximo 12 puntos por recorrido.');
    const puntos = [];
    for (const [i, p] of puntosIn.entries()) puntos.push(await geocodificar(p, `ubicación del punto ${i + 1}`));
    const advertencias = [];
    const [origen, ...resto] = puntos;
    const destino = resto.pop();
    const candidatos = await generarRutas(origen, resto, destino, false, advertencias);
    const peajesDe = (geometria) =>
      detectarPeajes(geometria, plazasPeaje, { categoria, radioKm: config.radioDeteccionPeajeKm }).map((p) => ({
        nombre: p.nombre,
        monto: p.monto,
        enVuelta: true,
      }));
    const [regreso] = await proveedor.ruta([puntos[puntos.length - 1], origen]);
    return {
      fuente: candidatos.some((c) => c.fuente === 'estimado') ? 'estimado' : 'osrm',
      rutas: candidatos.map((c, i) => ({
        id: `m${i}`,
        nombre: i === 0 ? 'Ruta principal' : `Alternativa ${i}`,
        descripcion: c.fuente === 'osrm' ? 'Por calles y carreteras reales' : 'Distancia estimada (sin servidor de rutas)',
        tramos: c.tramos.map((t) => ({ km: t.distanciaKm, min: t.duracionMin })),
        peajes: peajesDe(c.geometria),
        trazado: c.geometria.map(([lng, lat]) => [lat, lng]),
      })),
      retorno: { km: regreso.distanciaKm, min: regreso.duracionMin, peajes: peajesDe(regreso.geometria) },
      advertencias,
    };
  }

  const cotizar = async function cotizar(peticion = {}) {
    const advertencias = [];
    const params = combinarParametros(config.tarifa, peticion.parametros);
    const vehiculo = resolverVehiculo(peticion.vehiculo);
    const tipoViaje = peticion.tipoViaje || 'ida';
    if (!TIPOS_VIAJE.includes(tipoViaje)) throw errorPeticion(`tipoViaje debe ser uno de: ${TIPOS_VIAJE.join(', ')}.`);

    // --- Ubicaciones y pasajeros -------------------------------------------------
    const origen = await geocodificar(peticion.origen, 'ubicación de origen');
    const paradasIn = Array.isArray(peticion.paradas) ? peticion.paradas : [];
    const paradas = [];
    for (const [i, p] of paradasIn.entries()) {
      const ubic = await geocodificar(p?.ubicacion ?? p, `ubicación de la parada ${i + 1}`);
      const n = p?.pasajeros ?? 1;
      if (!Number.isInteger(n) || n < 0) throw errorPeticion(`paradas[${i}].pasajeros debe ser un entero >= 0.`);
      paradas.push({ ...ubic, nombre: p?.nombre || ubic.nombre || `Parada ${i + 1}`, pasajeros: n });
    }
    const destino = peticion.destino ? await geocodificar(peticion.destino, 'ubicación de destino') : null;
    if (!destino && !paradas.length) throw errorPeticion('Indica un destino o al menos una parada.');

    const bajanEnParadas = paradas.reduce((s, p) => s + p.pasajeros, 0);
    let pasajeros = peticion.pasajeros;
    if (pasajeros === undefined) pasajeros = bajanEnParadas + (destino ? peticion.destino?.pasajeros ?? (paradas.length ? 0 : 1) : 0);
    if (!Number.isInteger(pasajeros) || pasajeros < 1) throw errorPeticion('pasajeros debe ser un entero >= 1.');
    if (bajanEnParadas > pasajeros) {
      throw errorPeticion(`En las paradas bajan ${bajanEnParadas} pasajeros pero el total es ${pasajeros}.`);
    }
    if (!destino && bajanEnParadas !== pasajeros) {
      throw errorPeticion(
        `Sin destino final, todos los pasajeros deben bajar en alguna parada (bajan ${bajanEnParadas} de ${pasajeros}).`,
      );
    }
    if (pasajeros > vehiculo.capacidadPasajeros) {
      const alternativas = vehiculos
        .filter((v) => v.capacidadPasajeros >= pasajeros)
        .map((v) => `${v.id} (${v.capacidadPasajeros} pasajeros)`);
      throw errorPeticion(
        `El ${vehiculo.marca} ${vehiculo.modelo} lleva máximo ${vehiculo.capacidadPasajeros} pasajeros y pediste ${pasajeros}.`,
        { vehiculosConCapacidad: alternativas },
      );
    }
    const grupos = paradas.filter((p) => p.pasajeros > 0).map((p) => ({ punto: p, pasajeros: p.pasajeros }));
    if (destino && pasajeros - bajanEnParadas > 0) grupos.push({ punto: destino, pasajeros: pasajeros - bajanEnParadas });

    const optimizar = peticion.optimizarParadas !== false;
    const vuelta = { recogerEnParadas: true, esperaMin: 0, ...(peticion.vuelta || {}) };
    const esperaMin = Number(vuelta.esperaMin);
    if (!Number.isFinite(esperaMin) || esperaMin < 0) throw errorPeticion('vuelta.esperaMin debe ser un número >= 0.');
    const usarPeajesAuto = peticion.usarPeajesAutomaticos !== false;
    const peajesManuales = (peticion.peajesManuales || []).map((p, i) => {
      const monto = Number(p?.monto);
      if (!Number.isFinite(monto) || monto < 0) throw errorPeticion(`peajesManuales[${i}].monto debe ser un número >= 0.`);
      return { nombre: p.nombre || `Peaje manual ${i + 1}`, monto, enVuelta: p.enVuelta !== false, origen: 'manual' };
    });
    const peajesDe = (geometria, esVuelta) => [
      ...(usarPeajesAuto
        ? detectarPeajes(geometria, plazasPeaje, { categoria: vehiculo.categoriaPeaje, radioKm: config.radioDeteccionPeajeKm })
        : []),
      ...peajesManuales.filter((p) => !esVuelta || p.enVuelta).map(({ enVuelta, ...p }) => p),
    ];

    // --- Rutas -------------------------------------------------------------------
    const candidatos = await generarRutas(origen, paradas, destino, optimizar, advertencias);
    const fuentes = new Set(candidatos.map((c) => c.fuente));

    const cacheRutas = new Map();
    const rutaSimple = async (puntos) => {
      const clave = puntos.map((p) => `${p.lat},${p.lng}`).join(';');
      if (!cacheRutas.has(clave)) cacheRutas.set(clave, proveedor.ruta(puntos).then((rs) => rs[0]));
      return cacheRutas.get(clave);
    };

    const rutas = [];
    for (const [idx, c] of candidatos.entries()) {
      const puntosRuta = [origen, ...c.orden.map((i) => paradas[i]), ...(destino ? [destino] : [])];
      const final = puntosRuta[puntosRuta.length - 1];
      const puntosBajada = puntosRuta.length - 1;

      // Ocupación promedio en la ida, ponderada por km.
      let aBordo = pasajeros;
      let paxKm = 0;
      c.tramos.forEach((t, j) => {
        paxKm += aBordo * t.distanciaKm;
        aBordo -= puntosRuta[j + 1].pasajeros ?? 0;
      });
      const ocupacionIda = c.distanciaKm > 0 ? paxKm / c.distanciaKm : pasajeros;

      const recogerEnVuelta = vuelta.recogerEnParadas && paradas.length > 0;
      const regresoDirecto = await rutaSimple([final, origen]);
      fuentes.add(regresoDirecto.fuente);
      const rutaVuelta = recogerEnVuelta ? await rutaSimple([...puntosRuta].reverse()) : regresoDirecto;
      fuentes.add(rutaVuelta.fuente);

      const recIda = {
        concepto: 'Ida',
        km: c.distanciaKm,
        min: c.duracionMin,
        peajes: peajesDe(c.geometria, false),
        ocupacion: ocupacionIda,
      };
      const recRetornoVacio = {
        concepto: 'Retorno vacío',
        km: regresoDirecto.distanciaKm,
        min: regresoDirecto.duracionMin,
        peajes: peajesDe(regresoDirecto.geometria, true),
        ocupacion: 0,
        factor: params.porcentajeRetornoVacio / 100,
      };
      const recVuelta = {
        concepto: recogerEnVuelta ? 'Vuelta (recogiendo en las paradas)' : 'Vuelta directa',
        km: rutaVuelta.distanciaKm,
        min: rutaVuelta.duracionMin,
        peajes: peajesDe(rutaVuelta.geometria, true),
        ocupacion: recogerEnVuelta ? ocupacionIda : pasajeros,
      };

      const minutosParadas = puntosBajada * params.minutosPorParada;
      const tarifaIda = calcularTarifa({
        vehiculo,
        params,
        pasajeros,
        recorridos: recRetornoVacio.factor > 0 ? [recIda, recRetornoVacio] : [recIda],
        numParadas: puntosBajada - 1,
        minutosParadas,
      });
      const tarifaIdaVuelta = calcularTarifa({
        vehiculo,
        params,
        pasajeros,
        recorridos: [recIda, recVuelta],
        numParadas: (puntosBajada - 1) * (recogerEnVuelta ? 2 : 1),
        minutosParadas: minutosParadas * (recogerEnVuelta ? 2 : 1),
        esperaMin,
      });
      const tarifa = tipoViaje === 'ida' ? tarifaIda : tarifaIdaVuelta;
      const costoRetornoVacio = calcularTarifa({
        vehiculo,
        params: { ...params, tiempoMinimoCobroMin: 0 },
        pasajeros,
        recorridos: [{ ...recRetornoVacio, factor: 1 }],
      });

      rutas.push({
        id: idx + 1,
        nombre: c.nombre,
        etiquetas: [],
        fuenteMapa: c.fuente,
        distanciaKm: r2(c.distanciaKm),
        duracionMin: r(c.duracionMin),
        ordenPuntos: puntosRuta.map((p, i) => ({
          orden: i,
          tipo: i === 0 ? 'origen' : p === destino ? 'destino' : 'parada',
          nombre: p.nombre,
          lat: p.lat,
          lng: p.lng,
          bajan: i === 0 ? 0 : p === destino ? pasajeros - bajanEnParadas : p.pasajeros,
        })),
        tramos: c.tramos.map((t, j) => ({
          desde: puntosRuta[j].nombre,
          hasta: puntosRuta[j + 1].nombre,
          distanciaKm: r2(t.distanciaKm),
          duracionMin: r(t.duracionMin),
        })),
        peajes: recIda.peajes,
        geometria: { type: 'LineString', coordinates: c.geometria },
        geometriaVuelta: { type: 'LineString', coordinates: rutaVuelta.geometria },
        tarifa,
        tarifas: { ida: tarifaIda, idaVuelta: tarifaIdaVuelta },
        retornoVacioReferencia: {
          nota: 'Costo de volver sin pasajeros (solo ida). Súbelo con parametros.porcentajeRetornoVacio si quieres cobrarlo.',
          distanciaKm: r2(regresoDirecto.distanciaKm),
          costo: costoRetornoVacio.costoTotal,
          porcentajeCobrado: params.porcentajeRetornoVacio,
        },
        desglosePasajeros: desglosarPasajeros({
          puntosRuta,
          grupos,
          tramos: c.tramos,
          tarifaIda: calcularTarifa({ vehiculo, params, pasajeros, recorridos: [recIda] }),
          precioFinal: tarifa.precioFinal,
          pasajeros,
        }),
      });
    }

    // --- Etiquetas y recomendación ----------------------------------------------
    const minPor = (f) => rutas.reduce((a, b) => (f(b) < f(a) ? b : a));
    minPor((x) => x.distanciaKm).etiquetas.push('mas_corta');
    minPor((x) => x.duracionMin).etiquetas.push('mas_rapida');
    const recomendada = minPor((x) => x.tarifa.costoTotal * 1e6 + x.duracionMin);
    recomendada.etiquetas.push('mas_economica', 'recomendada');

    if (fuentes.has('estimado')) {
      advertencias.push(
        'No se pudo consultar el mapa (OSRM); distancias y tiempos son ESTIMADOS en línea recta corregida. ' +
          'Revisa la conexión o configura OSRM_URL.',
      );
    }
    const peajesSinVerificar = rutas.some((x) => x.peajes.some((p) => p.verificado === false));
    if (peajesSinVerificar) advertencias.push('Algunos peajes usan tarifas referenciales: verifica los montos vigentes.');

    return {
      moneda: params.moneda,
      tipoViaje,
      pasajeros,
      vehiculo,
      origen,
      destino,
      paradas: paradas.map(({ lat, lng, nombre, pasajeros: bajan }) => ({ nombre, lat, lng, bajan })),
      recomendada: recomendada.id,
      comparacion: rutas.map((x) => ({
        id: x.id,
        nombre: x.nombre,
        etiquetas: x.etiquetas,
        distanciaKm: x.distanciaKm,
        duracionMin: x.duracionMin,
        peajes: x.tarifa.peajes.monto,
        costoTotal: x.tarifa.costoTotal,
        precioFinal: x.tarifa.precioFinal,
        precioPorPasajero: x.tarifa.precioPorPasajero,
        precioIda: x.tarifas.ida.precioFinal,
        precioIdaVuelta: x.tarifas.idaVuelta.precioFinal,
      })),
      rutas,
      parametrosUsados: params,
      advertencias,
    };
  };
  cotizar.rutasMapa = rutasMapa;
  return cotizar;
}
