// Convierte una ubicación del request en { lat, lng, nombre }.
// Acepta { lat, lng }, [lat, lng] o un texto (dirección / lugar) que se busca
// en Nominatim (OpenStreetMap).

const errorUbicacion = (msg) => Object.assign(new Error(msg), { status: 400 });

export function crearGeocodificador({ url, userAgent, timeoutMs = 15000, fetchImpl = fetch }) {
  const cache = new Map();

  async function buscarTexto(texto) {
    const clave = texto.trim().toLowerCase();
    if (cache.has(clave)) return cache.get(clave);
    let data;
    try {
      const res = await fetchImpl(
        `${url.replace(/\/$/, '')}/search?format=json&limit=1&q=${encodeURIComponent(texto)}`,
        { headers: { 'User-Agent': userAgent }, signal: AbortSignal.timeout(timeoutMs) },
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      data = await res.json();
    } catch (err) {
      throw Object.assign(
        new Error(`No se pudo buscar la dirección "${texto}" (${err.message}). Envía coordenadas { lat, lng }.`),
        { status: 502 },
      );
    }
    if (!data.length) throw errorUbicacion(`No se encontró la dirección "${texto}".`);
    const punto = { lat: Number(data[0].lat), lng: Number(data[0].lon), nombre: data[0].display_name };
    cache.set(clave, punto);
    return punto;
  }

  // Varias coincidencias para el buscador de la app (solo Chile y vecinos).
  async function buscarLugares(texto) {
    const q = String(texto || '').trim();
    if (q.length < 3) return [];
    let res;
    try {
      res = await fetchImpl(
        `${url.replace(/\/$/, '')}/search?format=json&limit=6&addressdetails=1&countrycodes=cl,ar&accept-language=es&q=${encodeURIComponent(q)}`,
        { headers: { 'User-Agent': userAgent }, signal: AbortSignal.timeout(timeoutMs) },
      );
    } catch (err) {
      throw Object.assign(new Error(`No se pudo consultar el buscador de mapas (${err.message}).`), { status: 502 });
    }
    if (!res.ok) throw Object.assign(new Error(`El buscador de mapas respondió HTTP ${res.status}.`), { status: 502 });
    const data = await res.json();
    return data.map((d) => {
      const a = d.address || {};
      const lugar = a.city || a.town || a.village || a.municipality || a.county || '';
      const nombre = d.name && d.name !== lugar ? `${d.name}${lugar ? `, ${lugar}` : ''}` : lugar || d.display_name.split(',')[0];
      return { nombre, detalle: [a.state, a.country].filter(Boolean).join(', '), lat: Number(d.lat), lng: Number(d.lon) };
    });
  }

  const geocodificar = async function geocodificar(entrada, etiqueta = 'ubicación') {
    if (entrada == null || entrada === '') throw errorUbicacion(`Falta la ${etiqueta}.`);
    if (typeof entrada === 'string') return buscarTexto(entrada);

    let lat;
    let lng;
    let nombre;
    if (Array.isArray(entrada)) [lat, lng] = entrada;
    else ({ lat, lng = entrada.lon, nombre } = entrada);
    if (entrada.direccion && (lat === undefined || lng === undefined)) {
      return { ...(await buscarTexto(entrada.direccion)), ...(nombre ? { nombre } : {}) };
    }
    lat = Number(lat);
    lng = Number(lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
      throw errorUbicacion(`La ${etiqueta} no tiene coordenadas válidas (se espera { lat, lng }).`);
    }
    return { lat, lng, nombre: nombre || `${lat.toFixed(5)}, ${lng.toFixed(5)}` };
  };
  geocodificar.buscar = buscarLugares;
  return geocodificar;
}
