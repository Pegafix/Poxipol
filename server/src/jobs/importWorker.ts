import type { App } from '../app.js';

// Worker de la cola de PDFs. Puede correr dentro de la API o como proceso aparte (más instancias = más rápido).
export function startImportWorker(services: App['services'], log: (m: string) => void, idleMs = 1500) {
  let stopped = false;
  (async function loop() {
    while (!stopped) {
      try {
        const worked = await services.roadmaps.processNextImport();
        if (!worked) await new Promise(r => setTimeout(r, idleMs));
      } catch (e) {
        log(`worker: ${(e as Error).message}`);
        await new Promise(r => setTimeout(r, idleMs * 2));
      }
    }
  })();
  return () => { stopped = true; };
}
