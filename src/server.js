import { crearApp } from './app.js';
import { config } from './config.js';

crearApp().listen(config.port, () => {
  console.log(`API de traslados escuchando en http://localhost:${config.port}`);
  console.log(`Mapa de prueba: http://localhost:${config.port}/  ·  Rutas: ${config.routingProvider}`);
});
