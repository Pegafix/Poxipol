import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { config as configBase } from './config.js';
import { vehiculos, buscarVehiculos, obtenerVehiculo } from './data/vehiculos.js';
import { peajes, agregarPeaje, eliminarPeaje } from './data/peajes.js';
import { crearProveedor } from './services/routing.js';
import { crearGeocodificador } from './services/geocoding.js';
import { crearCotizador, combinarParametros } from './services/cotizador.js';
import { costoDesgastePorKm } from './services/costos.js';

const dirPublico = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public');

// Las dependencias se pueden inyectar (tests, otro proveedor de mapas).
export function crearApp({ config = configBase, proveedor, geocodificar } = {}) {
  proveedor ??= crearProveedor(config.routingProvider, {
    url: config.osrmUrl,
    userAgent: config.userAgent,
    timeoutMs: config.httpTimeoutMs,
    onFallback: (err) => console.warn(`[rutas] OSRM no disponible, usando estimado: ${err.message}`),
  });
  geocodificar ??= crearGeocodificador({
    url: config.nominatimUrl,
    userAgent: config.userAgent,
    timeoutMs: config.httpTimeoutMs,
  });
  const cotizar = crearCotizador({ proveedor, geocodificar, plazasPeaje: peajes, config });

  const app = express();
  app.use(express.json({ limit: '1mb' }));
  app.use(express.static(dirPublico));

  app.get('/api/salud', (_req, res) => res.json({ ok: true, proveedorRutas: proveedor.nombre }));

  // --- Vehículos ---------------------------------------------------------------
  const conCostos = (v) => ({ ...v, desgastePorKm: costoDesgastePorKm(v) });
  app.get('/api/vehiculos', (req, res) => {
    const lista = req.query.q ? buscarVehiculos(req.query.q) : vehiculos;
    const minPax = Number(req.query.pasajeros) || 0;
    res.json(lista.filter((v) => v.capacidadPasajeros >= minPax).map(conCostos));
  });
  app.get('/api/vehiculos/:id', (req, res) => {
    const v = obtenerVehiculo(req.params.id);
    if (!v) return res.status(404).json({ error: `No existe el vehículo "${req.params.id}".` });
    res.json(conCostos(v));
  });

  // --- Peajes ------------------------------------------------------------------
  app.get('/api/peajes', (_req, res) => res.json(peajes));
  app.post('/api/peajes', (req, res) => res.status(201).json(agregarPeaje(req.body || {})));
  app.delete('/api/peajes/:id', (req, res) => {
    if (!eliminarPeaje(req.params.id)) return res.status(404).json({ error: 'Peaje no encontrado.' });
    res.status(204).end();
  });

  // --- Parámetros de tarifa ----------------------------------------------------
  app.get('/api/parametros', (_req, res) => res.json(config.tarifa));
  app.patch('/api/parametros', (req, res) => {
    config.tarifa = combinarParametros(config.tarifa, req.body || {});
    res.json(config.tarifa);
  });

  // --- Cotización --------------------------------------------------------------
  app.post('/api/cotizar', async (req, res) => res.json(await cotizar(req.body || {})));

  app.use('/api', (_req, res) => res.status(404).json({ error: 'Ruta no encontrada.' }));

  // eslint-disable-next-line no-unused-vars
  app.use((err, _req, res, _next) => {
    const status = err.status || (err.type === 'entity.parse.failed' ? 400 : 500);
    if (status >= 500) console.error(err);
    res.status(status).json({
      error: status >= 500 && !err.status ? 'Error interno del servidor.' : err.message,
      ...(err.detalles ? { detalles: err.detalles } : {}),
    });
  });

  return app;
}
