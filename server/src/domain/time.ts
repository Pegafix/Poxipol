// Hora local del usuario calculada en el SERVIDOR con su zona horaria guardada.
// El reloj del cliente nunca decide si Mochi duerme: así no se puede hacer trampa cambiando la hora del teléfono.

export interface LocalTime {
  day: string;        // 'YYYY-MM-DD' en la zona del usuario
  hour: number;       // 0–23.99
}

const fmtCache = new Map<string, Intl.DateTimeFormat>();
function formatter(tz: string) {
  let f = fmtCache.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
    fmtCache.set(tz, f);
  }
  return f;
}

export function isValidTimeZone(tz: string): boolean {
  try { formatter(tz).format(0); return true; } catch { return false; }
}

export function localTime(at: Date, tz: string): LocalTime {
  const parts = Object.fromEntries(formatter(tz).formatToParts(at).map(p => [p.type, p.value]));
  return { day: `${parts.year}-${parts.month}-${parts.day}`, hour: Number(parts.hour) + Number(parts.minute) / 60 };
}

export function addDays(day: string, n: number): string {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);
}

// La noche pertenece a la mañana en que termina: despertarlo a las 23:30 del lunes cuenta para el martes.
export function nightKey(t: LocalTime): string {
  return t.hour >= 23 ? addDays(t.day, 1) : t.day;
}

// Minutos que faltan para la próxima hora local "h" (sirve para saber cuándo cambia su estado).
export function minutesUntilHour(t: LocalTime, h: number): number {
  const diff = (h - t.hour + 24) % 24;
  return Math.max(1, Math.round((diff === 0 ? 24 : diff) * 60));
}
