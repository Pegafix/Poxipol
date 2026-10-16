import { test } from 'node:test';
import assert from 'node:assert/strict';

import { calcularTarifa, rendimientoKmL, costoDesgastePorKm } from '../src/services/costos.js';
import { mejoresOrdenes } from '../src/services/optimizador.js';
import { resolverVehiculo } from '../src/data/vehiculos.js';
import { config } from '../src/config.js';

const vehiculo = {
  marca: 'Test',
  modelo: 'Van',
  capacidadPasajeros: 10,
  combustible: 'diesel',
  rendimientoCiudadKmL: 8,
  rendimientoCarreteraKmL: 12,
  precioCompra: 30000000,
  valorResidualPct: 20,
  vidaUtilKm: 400000,
  mantencionPorKm: 40,
  neumaticosPorKm: 10,
  costoFijoAnual: 1200000,
  categoriaPeaje: 1,
};

const params = {
  ...config.tarifa,
  precioCombustible: { diesel: 1000, gasolina: 1300 },
  valorHoraConductor: 6000,
  valorHoraEspera: 3000,
  tiempoMinimoCobroMin: 0,
  horasOperativasAnuales: 2000,
  factorCargaMaxPct: 0,
  imprevistosPct: 0,
  margenGananciaPct: 25,
  recargoPorParada: 2000,
  incluirIVA: false,
  redondeo: 1,
};

test('rendimiento interpola entre ciudad y carretera según velocidad', () => {
  assert.equal(rendimientoKmL(vehiculo, 20), 8);
  assert.equal(rendimientoKmL(vehiculo, 100), 12);
  assert.equal(rendimientoKmL(vehiculo, 55), 10);
});

test('desgaste por km = depreciación + mantención + neumáticos', () => {
  const d = costoDesgastePorKm(vehiculo);
  assert.equal(d.depreciacion, 60); // 30M * 80% / 400.000 km
  assert.equal(d.total, 110);
});

test('tarifa suma combustible, peajes, desgaste, conductor y fijos, más margen', () => {
  const t = calcularTarifa({
    vehiculo,
    params,
    pasajeros: 4,
    recorridos: [{ concepto: 'Ida', km: 120, min: 90, peajes: [{ nombre: 'P1', monto: 3000 }], ocupacion: 4 }],
  });
  // 120 km a 80 km/h -> 12 km/L -> 10 L * 1000
  assert.equal(t.combustible.litros, 10);
  assert.equal(t.combustible.monto, 10000);
  assert.equal(t.peajes.monto, 3000);
  assert.equal(t.desgaste.monto, 13200);
  assert.equal(t.conductor.monto, 9000); // 1,5 h * 6000
  assert.equal(t.costosFijos.monto, 900); // 1,5 h * 600
  assert.equal(t.costoTotal, 36100);
  assert.equal(t.precioFinal, 45125); // + 25 %
  assert.equal(t.precioPorPasajero, Math.ceil(45125 / 4));
  assert.equal(t.precioMinimoSinPerdida, 36100);
});

test('tiempo mínimo, espera, paradas, IVA y redondeo', () => {
  const t = calcularTarifa({
    vehiculo,
    params: { ...params, tiempoMinimoCobroMin: 60, incluirIVA: true, ivaPct: 19, redondeo: 500 },
    pasajeros: 2,
    recorridos: [{ concepto: 'Ida', km: 10, min: 20, peajes: [], ocupacion: 2 }],
    numParadas: 1,
    minutosParadas: 10,
  });
  assert.equal(t.tiempo.minimoCobradoExtraMin, 30);
  assert.equal(t.conductor.monto, 6000);
  assert.equal(t.recargoParadas.monto, 2000);
  assert.equal(t.precioFinal % 500, 0);
  assert.ok(t.iva.monto > 0);
  assert.ok(t.precioFinal >= t.precioNeto + t.iva.monto);
});

test('retorno vacío parcial solo cobra el porcentaje indicado', () => {
  const base = { concepto: 'Ida', km: 100, min: 75, peajes: [{ nombre: 'P', monto: 2000 }], ocupacion: 0 };
  const completo = calcularTarifa({ vehiculo, params, pasajeros: 1, recorridos: [base] });
  const mitad = calcularTarifa({ vehiculo, params, pasajeros: 1, recorridos: [{ ...base, factor: 0.5 }] });
  assert.equal(mitad.peajes.monto, 1000);
  assert.equal(mitad.distanciaTotalKm, 50);
  assert.ok(Math.abs(mitad.costoTotal * 2 - completo.costoTotal) <= 2);
});

test('optimizador encuentra el orden de menor recorrido', () => {
  // 0 = origen; puntos en una línea: 0 -- 1 -- 2 -- 3
  const pos = [0, 1, 2, 3];
  const m = pos.map((a) => pos.map((b) => Math.abs(a - b)));
  const [mejor, segundo] = mejoresOrdenes(m, { paradas: [3, 1, 2], k: 3 });
  assert.deepEqual(mejor.orden, [1, 2, 3]);
  assert.equal(mejor.costo, 3);
  assert.ok(segundo.costo > mejor.costo);
});

test('resolverVehiculo busca por nombre, permite ajustes y rechaza modelos desconocidos', () => {
  assert.equal(resolverVehiculo('toyota hiace').id, 'toyota-hiace');
  assert.equal(resolverVehiculo('Sprinter').id, 'mercedes-sprinter');
  const ajustado = resolverVehiculo({ modelo: 'Toyota Hiace', rendimientoCarreteraKmL: 13 });
  assert.equal(ajustado.rendimientoCarreteraKmL, 13);
  assert.equal(ajustado.personalizado, true);
  assert.throws(() => resolverVehiculo('Ferrari Testarossa'), /no está en el catálogo/);
  assert.throws(() => resolverVehiculo('van'), /no está en el catálogo/);
  const propio = resolverVehiculo({ ...vehiculo, modelo: 'Mi furgón' });
  assert.equal(propio.id, 'personalizado');
});
