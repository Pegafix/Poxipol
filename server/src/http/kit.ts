import type { FastifyReply, FastifyRequest } from 'fastify';
import { z, type ZodTypeAny } from 'zod';
import { errors } from './errors.js';

// Valida y tipa cualquier entrada. Un fallo se convierte en 400 VALIDATION_FAILED con el detalle por campo.
export function parse<S extends ZodTypeAny>(schema: S, value: unknown): z.infer<S> {
  const r = schema.safeParse(value);
  if (!r.success) throw errors.validation(r.error.issues.map(i => ({ path: i.path.join('.'), message: i.message })));
  return r.data;
}

// Respuesta uniforme: siempre { data, meta }. meta.rev permite al cliente saber si ya está al día.
export function ok(reply: FastifyReply, data: unknown, opts: { status?: number; rev?: number | null; replayed?: boolean } = {}) {
  if (opts.replayed) reply.header('Idempotent-Replayed', 'true');
  const rev = opts.rev ?? (data as { rev?: number } | null)?.rev ?? undefined;
  return reply.status(opts.status ?? 200).send({ data, meta: { serverTime: new Date().toISOString(), ...(rev != null ? { rev } : {}) } });
}

// Los comandos con efecto aceptan Idempotency-Key (recomendado en móvil, donde los reintentos son comunes).
const IdemKey = z.string().regex(/^[A-Za-z0-9_\-:.]{8,80}$/, 'Idempotency-Key debe tener entre 8 y 80 caracteres seguros');
export function idempotencyKey(req: FastifyRequest): string | undefined {
  const v = req.headers['idempotency-key'];
  if (v === undefined) return undefined;
  return parse(IdemKey, Array.isArray(v) ? v[0] : v);
}

// If-Match: "v12" para ediciones con concurrencia optimista.
export function ifMatchVersion(req: FastifyRequest): number {
  const raw = req.headers['if-match'];
  const m = typeof raw === 'string' ? raw.match(/^(?:W\/)?"?v?(\d+)"?$/) : null;
  if (!m) throw errors.rule('VALIDATION_FAILED', 'Falta el encabezado If-Match con la versión que tienes (por ejemplo: "v3").');
  return Number(m[1]);
}

export const Uuid = z.string().uuid();
export const Slug = z.string().regex(/^[a-z0-9_]{1,40}$/);
