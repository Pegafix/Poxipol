// Ordena las paradas para recorrer la menor distancia (o tiempo) posible.
// Hasta 8 paradas prueba todas las combinaciones (óptimo exacto); con más usa
// vecino más cercano + mejora 2-opt.

const LIMITE_EXACTO = 8;

// Costo de recorrer: inicio -> orden... -> fin (fin opcional).
export function costoRecorrido(matriz, inicio, orden, fin = null) {
  let total = 0;
  let actual = inicio;
  for (const i of orden) {
    total += matriz[actual][i];
    actual = i;
  }
  if (fin !== null) total += matriz[actual][fin];
  return total;
}

function* permutaciones(arr) {
  if (arr.length <= 1) {
    yield arr.slice();
    return;
  }
  for (let i = 0; i < arr.length; i++) {
    const resto = [...arr.slice(0, i), ...arr.slice(i + 1)];
    for (const p of permutaciones(resto)) yield [arr[i], ...p];
  }
}

function vecinoMasCercano(matriz, inicio, paradas) {
  const pendientes = new Set(paradas);
  const orden = [];
  let actual = inicio;
  while (pendientes.size) {
    let mejor = null;
    for (const p of pendientes) if (mejor === null || matriz[actual][p] < matriz[actual][mejor]) mejor = p;
    orden.push(mejor);
    pendientes.delete(mejor);
    actual = mejor;
  }
  return orden;
}

function dosOpt(matriz, inicio, orden, fin) {
  let mejor = orden.slice();
  let mejorCosto = costoRecorrido(matriz, inicio, mejor, fin);
  let mejoro = true;
  while (mejoro) {
    mejoro = false;
    for (let i = 0; i < mejor.length - 1; i++) {
      for (let j = i + 1; j < mejor.length; j++) {
        const candidato = [...mejor.slice(0, i), ...mejor.slice(i, j + 1).reverse(), ...mejor.slice(j + 1)];
        const costo = costoRecorrido(matriz, inicio, candidato, fin);
        if (costo + 1e-9 < mejorCosto) {
          mejor = candidato;
          mejorCosto = costo;
          mejoro = true;
        }
      }
    }
  }
  return mejor;
}

// Devuelve hasta k órdenes distintos de las paradas, del más barato al más caro.
export function mejoresOrdenes(matriz, { inicio = 0, paradas, fin = null, k = 3 }) {
  if (paradas.length <= LIMITE_EXACTO) {
    const top = [];
    for (const orden of permutaciones(paradas)) {
      const costo = costoRecorrido(matriz, inicio, orden, fin);
      if (top.length < k || costo < top[top.length - 1].costo) {
        top.push({ orden, costo });
        top.sort((a, b) => a.costo - b.costo);
        if (top.length > k) top.pop();
      }
    }
    return top;
  }
  const orden = dosOpt(matriz, inicio, vecinoMasCercano(matriz, inicio, paradas), fin);
  return [{ orden, costo: costoRecorrido(matriz, inicio, orden, fin) }];
}
