import { Redis } from 'ioredis';

// Caché para datos derivados y efímeros (instantáneas del compañero, ventana de toques, pausas, límites).
// La base de datos sigue siendo la fuente de verdad: si la caché se vacía, todo se recalcula.
export interface Cache {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlSeconds: number): Promise<void>;
  del(...keys: string[]): Promise<void>;
  /** Registra un evento en una ventana deslizante y devuelve cuántos hubo en los últimos windowMs. */
  hitWindow(key: string, windowMs: number, now: number): Promise<number>;
  /** Contador de ventana fija para límites de tasa. Devuelve el total y los segundos que faltan. */
  incrFixed(key: string, windowSeconds: number): Promise<{ count: number; ttl: number }>;
  close(): Promise<void>;
}

export function createRedisCache(url: string): Cache {
  const r = new Redis(url, { maxRetriesPerRequest: 1, enableOfflineQueue: false, lazyConnect: false });
  r.on('error', () => { /* sin Redis se degrada: los llamadores capturan y recalculan */ });
  return {
    get: k => r.get(k),
    async set(k, v, ttl) { await r.set(k, v, 'EX', Math.max(1, Math.ceil(ttl))); },
    async del(...ks) { if (ks.length) await r.del(...ks); },
    async hitWindow(k, windowMs, now) {
      const res = await r.multi()
        .zremrangebyscore(k, 0, now - windowMs)
        .zadd(k, now, `${now}:${Math.random().toString(36).slice(2, 8)}`)
        .zcard(k)
        .pexpire(k, windowMs)
        .exec();
      return Number(res?.[2]?.[1] ?? 0);
    },
    async incrFixed(k, win) {
      const res = await r.multi().incr(k).expire(k, win, 'NX').ttl(k).exec();
      return { count: Number(res?.[0]?.[1] ?? 0), ttl: Math.max(1, Number(res?.[2]?.[1] ?? win)) };
    },
    async close() { r.disconnect(); }
  };
}

// Implementación en memoria: desarrollo local y pruebas sin Redis. No sirve con varias instancias.
export function createMemoryCache(): Cache {
  const kv = new Map<string, { v: string; exp: number }>();
  const zs = new Map<string, number[]>();
  const alive = (k: string) => { const e = kv.get(k); if (e && e.exp < Date.now()) { kv.delete(k); return null; } return e ?? null; };
  return {
    async get(k) { return alive(k)?.v ?? null; },
    async set(k, v, ttl) { kv.set(k, { v, exp: Date.now() + ttl * 1000 }); },
    async del(...ks) { ks.forEach(k => { kv.delete(k); zs.delete(k); }); },
    async hitWindow(k, windowMs, now) {
      const list = (zs.get(k) ?? []).filter(t => t > now - windowMs);
      list.push(now); zs.set(k, list); return list.length;
    },
    async incrFixed(k, win) {
      const e = alive(k);
      const count = (e ? Number(e.v) : 0) + 1;
      const exp = e?.exp ?? Date.now() + win * 1000;
      kv.set(k, { v: String(count), exp });
      return { count, ttl: Math.max(1, Math.ceil((exp - Date.now()) / 1000)) };
    },
    async close() {}
  };
}
