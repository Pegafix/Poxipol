# Poxipol · API de traslado de pasajeros

API REST (Node.js + Express) para cotizar traslados de pasajeros sobre el mapa:

- Calcula **al menos 3 rutas** entre los puntos (OpenStreetMap vía OSRM) y marca la **más corta**, la **más rápida** y la **recomendada** (la de menor costo).
- Según el **modelo del vehículo** calcula el gasto en **combustible**, **peajes**, **desgaste** (depreciación, mantención, neumáticos), **tiempo del conductor** y **costos fijos**, y entrega **cuánto cobrar** para que el viaje salga a cuenta.
- Cotiza **solo ida** e **ida y vuelta** (con tiempo de espera y la opción de cobrar el retorno vacío).
- Soporta **varias paradas**: optimiza el orden de las bajadas y **reparte el cobro por pasajero** según cuántos km viaja cada uno.
- Incluye la app interactiva en `http://localhost:3000/` con el mapa real (ver abajo).

## App interactiva

La misma página funciona de dos formas:

| Dónde | Mapa y rutas | Cómo |
|---|---|---|
| **En tu computador** (`npm start` → http://localhost:3000) | Mapa real de OpenStreetMap, rutas por calles reales (OSRM) y búsqueda de cualquier dirección | Recomendado para usar en serio |
| **En claude.ai** (artifact) | Mapa de Chile con las 343 comunas; Claude calcula rutas, km, tiempos y peajes, busca direcciones, los datos de tu vehículo y el precio del combustible de tu región | Abrir y usar, sin instalar nada |

Parte en blanco: eliges el vehículo (o escribes tu modelo), escribes origen y destino, y las rutas, el combustible y el precio se calculan solos.

Se edita `artifact/plantilla.html` y se genera la página con `node artifact/build.mjs` (incrusta Leaflet, el mapa, lagos, ríos y comunas de `artifact/datos/`).

## Uso rápido

```bash
npm install
npm start          # http://localhost:3000
npm test
```

Variables de entorno útiles (ver `src/config.js` para todas):

| Variable | Default | Descripción |
|---|---|---|
| `PORT` | `3000` | Puerto HTTP |
| `ROUTING_PROVIDER` | `auto` | `osrm` (mapa real), `estimado` (sin red) o `auto` (OSRM y si falla, estimado) |
| `OSRM_URL` | `https://router.project-osrm.org` | Servidor OSRM. El público es solo de demostración: para producción usa uno propio |
| `PRECIO_GASOLINA` / `PRECIO_DIESEL` | `1290` / `990` | $/litro |
| `VALOR_HORA_CONDUCTOR` | `6000` | $/hora manejando |
| `MARGEN_GANANCIA_PCT` | `25` | Utilidad sobre el costo |
| `INCLUIR_IVA` | `false` | Agregar IVA al precio |

Todos los valores monetarios están en CLP y son **referenciales**: ajústalos a tus precios reales (por variable de entorno, `PATCH /api/parametros` o en cada cotización con `parametros`).

## Cómo se calcula el precio

Por cada ruta:

| Concepto | Fórmula |
|---|---|
| Combustible | `km ÷ rendimiento × precio litro`. El rendimiento se interpola entre ciudad (≤30 km/h promedio) y carretera (≥80 km/h), y aumenta hasta `factorCargaMaxPct` % con el vehículo lleno |
| Peajes | Plazas por las que pasa el trazado (según categoría del vehículo) + `peajesManuales` |
| Desgaste | `km × (depreciación + mantención + neumáticos)`; depreciación = `precio × (1 − residual%) ÷ vida útil km` |
| Conductor | `(manejo + paradas) × valor hora + espera × valor hora espera`; se cobra un tiempo mínimo (`tiempoMinimoCobroMin`) |
| Costos fijos | `(seguro + permiso + revisión anual) ÷ horas operativas al año × horas del viaje` |
| Imprevistos | `imprevistosPct` % del subtotal |
| **Costo total** | Suma anterior = **precio mínimo sin pérdida** |
| Precio sugerido | `costo + margen% + recargo por parada extra (+ IVA)`, redondeado hacia arriba |

- **Solo ida**: el recorrido de ida. El regreso vacío del vehículo se informa en `retornoVacioReferencia` y se cobra el `porcentajeRetornoVacio` que indiques (0 por defecto).
- **Ida y vuelta**: ida + vuelta (por defecto recogiendo en las mismas paradas en orden inverso; con `vuelta.recogerEnParadas: false` vuelve directo) + tiempo de espera.
- **Varias paradas**: el costo de cada tramo se divide entre los pasajeros que van a bordo en ese tramo, así quien baja más lejos paga más. La suma de los grupos es exactamente el precio final.

## Endpoints

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/api/vehiculos?q=hiace&pasajeros=10` | Catálogo de modelos (con desgaste por km). Filtra por texto y capacidad |
| `GET` | `/api/vehiculos/:id` | Un modelo |
| `GET` | `/api/peajes` | Plazas de peaje cargadas |
| `POST` | `/api/peajes` | Agrega una plaza `{ nombre, lat, lng, tarifas: { "1": 3000, "2": 5400 } }` |
| `DELETE` | `/api/peajes/:id` | Elimina una plaza |
| `GET` / `PATCH` | `/api/parametros` | Ver / cambiar los parámetros de tarifa por defecto |
| `POST` | `/api/cotizar` | **Cotiza un traslado** |
| `POST` | `/api/rutas` | Rutas sobre el mapa real para la app `{ puntos: [{lat, lng}], categoriaPeaje }` |
| `GET` | `/api/buscar?q=lautaro` | Busca direcciones y lugares en OpenStreetMap |

### `POST /api/cotizar`

```json
{
  "vehiculo": "Toyota Hiace",
  "origen": { "lat": -33.4489, "lng": -70.6693, "nombre": "Santiago" },
  "paradas": [
    { "ubicacion": "Viña del Mar, Chile", "nombre": "Hotel Viña", "pasajeros": 3 },
    { "lat": -32.93, "lng": -71.52, "nombre": "Reñaca", "pasajeros": 2 }
  ],
  "destino": { "lat": -33.0472, "lng": -71.6127, "nombre": "Terminal Valparaíso" },
  "pasajeros": 8,
  "tipoViaje": "ida_vuelta",
  "vuelta": { "esperaMin": 120, "recogerEnParadas": true },
  "optimizarParadas": true,
  "peajesManuales": [{ "nombre": "TAG Costanera Norte", "monto": 2100, "enVuelta": true }],
  "parametros": { "margenGananciaPct": 30, "precioCombustible": { "diesel": 1010 } }
}
```

| Campo | Descripción |
|---|---|
| `vehiculo` | Id o nombre del modelo del catálogo (`"toyota-hiace"`, `"Sprinter"`), o un objeto con ajustes (`{ "modelo": "Toyota Hiace", "rendimientoCarreteraKmL": 12 }`) o con todos los datos de un vehículo propio |
| `origen`, `destino`, `paradas[].ubicacion` | `{ lat, lng }`, `[lat, lng]` o texto con la dirección (se busca en OpenStreetMap) |
| `paradas[].pasajeros` | Pasajeros que **bajan** en esa parada (default 1) |
| `destino` | Opcional si hay paradas. En él bajan los pasajeros restantes |
| `pasajeros` | Total que sube en el origen. Se valida contra la capacidad del vehículo |
| `tipoViaje` | `ida` o `ida_vuelta` (la respuesta trae siempre ambas tarifas en `tarifas`) |
| `optimizarParadas` | `true` (default) busca el orden de paradas más corto |
| `usarPeajesAutomaticos` | `false` para ignorar las plazas cargadas |
| `parametros` | Sobrescribe cualquier parámetro de tarifa solo para esta cotización |

Respuesta (resumida):

```json
{
  "recomendada": 1,
  "comparacion": [
    { "id": 1, "nombre": "Paradas en orden óptimo (menor distancia)", "etiquetas": ["mas_corta", "mas_economica", "recomendada"],
      "distanciaKm": 131.4, "duracionMin": 118, "costoTotal": 96210, "precioFinal": 125500,
      "precioIda": 58000, "precioIdaVuelta": 125500 }
  ],
  "rutas": [
    {
      "id": 1,
      "ordenPuntos": [ ... ],
      "tramos": [ ... ],
      "peajes": [ ... ],
      "geometria": { "type": "LineString", "coordinates": [ ... ] },
      "tarifa": { "combustible": {}, "peajes": {}, "desgaste": {}, "conductor": {}, "costoTotal": 0, "precioFinal": 0, "precioPorPasajero": 0, "...": "" },
      "tarifas": { "ida": {}, "idaVuelta": {} },
      "retornoVacioReferencia": { "distanciaKm": 0, "costo": 0 },
      "desglosePasajeros": [
        { "nombre": "Hotel Viña", "pasajeros": 3, "kmABordo": 118.2, "montoGrupo": 0, "montoPorPasajero": 0 }
      ]
    }
  ],
  "advertencias": []
}
```

## Datos a revisar

- **Vehículos** (`src/data/vehiculos.js`): rendimientos, precios y costos aproximados del mercado chileno. Ajusta los de tu vehículo o envíalos en la cotización.
- **Peajes** (`src/data/peajes.js`): algunas plazas troncales con coordenadas y tarifas **referenciales** (`verificado: false`). Verifica las tarifas vigentes de cada concesionaria y carga las tuyas. Las autopistas urbanas con TAG van en `peajesManuales`.
- Sin conexión al servidor OSRM la API sigue respondiendo con distancias **estimadas** (línea recta × 1,3) y lo avisa en `advertencias`; en ese modo los peajes automáticos no se detectan bien porque no hay trazado real.
