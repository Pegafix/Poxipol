import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';

import { crearApp } from '../src/app.js';
import { config } from '../src/config.js';
import { crearProveedorEstimado, crearProveedorOSRM } from '../src/services/routing.js';
import { crearGeocodificador } from '../src/services/geocoding.js';
import { peajes } from '../src/data/peajes.js';

const SANTIAGO = { lat: -33.4489, lng: -70.6693, nombre: 'Santiago' };
const VALPO = { lat: -33.0472, lng: -71.6127, nombre: 'Valparaíso' };

let servidor;
let base;
const post = async (path, body) => {
  const res = await fetch(`${base}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  return { status: res.status, body: res.status === 204 ? null : await res.json() };
};

before(async () => {
  const app = crearApp({
    config: { ...config, tarifa: { ...config.tarifa } },
    proveedor: crearProveedorEstimado(),
    geocodificar: crearGeocodificador({ url: 'http://invalido', userAgent: 'test', fetchImpl: async () => { throw new Error('sin red'); } }),
  });
  await new Promise((ok) => {
    servidor = app.listen(0, ok);
  });
  base = `http://127.0.0.1:${servidor.address().port}`;
});
after(() => servidor.close());

test('GET /api/vehiculos filtra por texto y capacidad', async () => {
  const todos = await (await fetch(`${base}/api/vehiculos`)).json();
  assert.ok(todos.length >= 10);
  const grandes = await (await fetch(`${base}/api/vehiculos?pasajeros=15`)).json();
  assert.ok(grandes.every((v) => v.capacidadPasajeros >= 15));
  const hiace = await (await fetch(`${base}/api/vehiculos?q=hiace`)).json();
  assert.equal(hiace[0].id, 'toyota-hiace');
  assert.ok(hiace[0].desgastePorKm.total > 0);
});

test('cotización A -> B entrega al menos 3 rutas con ida e ida y vuelta', async () => {
  const { status, body } = await post('/api/cotizar', {
    vehiculo: 'Toyota Hiace',
    origen: SANTIAGO,
    destino: VALPO,
    pasajeros: 6,
    tipoViaje: 'ida_vuelta',
    vuelta: { esperaMin: 60 },
  });
  assert.equal(status, 200);
  assert.ok(body.rutas.length >= 3);
  const ids = new Set(body.rutas.map((r) => r.distanciaKm));
  assert.equal(ids.size, body.rutas.length, 'las rutas deben ser distintas');
  const rec = body.rutas.find((r) => r.id === body.recomendada);
  assert.ok(rec.etiquetas.includes('recomendada'));
  for (const r of body.rutas) {
    assert.ok(r.tarifas.idaVuelta.precioFinal > r.tarifas.ida.precioFinal);
    assert.equal(r.tarifa.precioFinal, r.tarifas.idaVuelta.precioFinal);
    assert.ok(r.tarifa.precioFinal > r.tarifa.costoTotal, 'el precio debe cubrir los costos');
    assert.equal(r.tarifa.tiempo.esperaMin, 60);
  }
});

test('peajes del recorrido se detectan sobre el trazado y se suman a la ida y a la vuelta', async () => {
  const plaza = { id: 999, nombre: 'Peaje de prueba', lat: (SANTIAGO.lat + VALPO.lat) / 2, lng: (SANTIAGO.lng + VALPO.lng) / 2, tarifas: { 1: 3000, 2: 5000 }, verificado: true };
  peajes.push(plaza);
  try {
    const { body } = await post('/api/cotizar', {
      vehiculo: 'toyota-hiace',
      origen: SANTIAGO,
      destino: VALPO,
      pasajeros: 3,
      peajesManuales: [{ nombre: 'TAG Costanera', monto: 1500, enVuelta: false }],
    });
    const directa = body.rutas[0];
    assert.deepEqual(directa.peajes.map((p) => p.nombre), ['Peaje de prueba', 'TAG Costanera']);
    assert.equal(directa.tarifas.ida.peajes.monto, 4500);
    assert.equal(directa.tarifas.idaVuelta.peajes.monto, 7500);
  } finally {
    peajes.splice(peajes.indexOf(plaza), 1);
  }
});

test('varias paradas: optimiza el orden y reparte el cobro por pasajero', async () => {
  // Paradas ingresadas en desorden a lo largo de la costa (de sur a norte).
  const { status, body } = await post('/api/cotizar', {
    vehiculo: { modelo: 'Mercedes-Benz Sprinter' },
    origen: SANTIAGO,
    paradas: [
      { lat: -32.9, lng: -71.5, nombre: 'Concón', pasajeros: 3 },
      { lat: -33.0472, lng: -71.6127, nombre: 'Valparaíso', pasajeros: 4 },
      { lat: -33.0245, lng: -71.5518, nombre: 'Viña del Mar', pasajeros: 2 },
    ],
    pasajeros: 9,
  });
  assert.equal(status, 200, JSON.stringify(body));
  assert.ok(body.rutas.length >= 3);
  const nombres = body.rutas.map((r) => r.nombre);
  assert.ok(nombres.some((n) => n.includes('orden óptimo')));
  assert.ok(nombres.some((n) => n.includes('orden ingresado')));

  const optima = body.rutas.find((r) => r.nombre.includes('orden óptimo'));
  assert.ok(body.rutas.every((r) => optima.distanciaKm <= r.distanciaKm + 1e-9));
  const desglose = optima.desglosePasajeros;
  assert.equal(desglose.reduce((s, g) => s + g.pasajeros, 0), 9);
  assert.equal(desglose.reduce((s, g) => s + g.montoGrupo, 0), optima.tarifa.precioFinal);
  // Quien baja más lejos paga más por pasajero.
  const ordenado = [...desglose].sort((a, b) => a.kmABordo - b.kmABordo);
  assert.ok(ordenado[0].montoPorPasajero < ordenado[ordenado.length - 1].montoPorPasajero);
  assert.equal(optima.tarifa.recargoParadas.paradas, 2);
});

test('valida capacidad, vehículo y datos de entrada', async () => {
  let r = await post('/api/cotizar', { vehiculo: 'Toyota Corolla', origen: SANTIAGO, destino: VALPO, pasajeros: 8 });
  assert.equal(r.status, 400);
  assert.match(r.body.error, /máximo 4 pasajeros/);
  assert.ok(r.body.detalles.vehiculosConCapacidad.length > 0);

  r = await post('/api/cotizar', { vehiculo: 'Nave espacial', origen: SANTIAGO, destino: VALPO });
  assert.equal(r.status, 400);

  r = await post('/api/cotizar', { vehiculo: 'Toyota Hiace', origen: SANTIAGO });
  assert.equal(r.status, 400);

  r = await post('/api/cotizar', { vehiculo: 'Toyota Hiace', origen: 'Plaza de Armas', destino: VALPO });
  assert.equal(r.status, 502);

  r = await post('/api/cotizar', { vehiculo: 'Toyota Hiace', origen: SANTIAGO, destino: VALPO, tipoViaje: 'circular' });
  assert.equal(r.status, 400);
});

test('el proveedor OSRM interpreta rutas alternativas y matrices', async () => {
  const respuestas = {
    route: {
      code: 'Ok',
      routes: [
        { distance: 120000, duration: 5400, geometry: { coordinates: [[-70.6, -33.4], [-71.6, -33.0]] }, legs: [{ distance: 120000, duration: 5400 }] },
        { distance: 130000, duration: 6000, geometry: { coordinates: [[-70.6, -33.4], [-71.6, -33.0]] }, legs: [{ distance: 130000, duration: 6000 }] },
      ],
    },
    table: { code: 'Ok', distances: [[0, 1000], [1200, 0]], durations: [[0, 60], [70, 0]] },
  };
  const urls = [];
  const osrm = crearProveedorOSRM({
    url: 'http://osrm.test',
    fetchImpl: async (url) => {
      urls.push(url);
      return { ok: true, json: async () => (url.includes('/route/') ? respuestas.route : respuestas.table) };
    },
  });
  const rutas = await osrm.ruta([SANTIAGO, VALPO], { alternativas: true });
  assert.equal(rutas.length, 2);
  assert.equal(rutas[0].distanciaKm, 120);
  assert.equal(rutas[0].duracionMin, 90);
  assert.match(urls[0], /alternatives=3/);
  const m = await osrm.matriz([SANTIAGO, VALPO]);
  assert.equal(m.distanciasKm[1][0], 1.2);
  assert.equal(m.duracionesMin[0][1], 1);
});
