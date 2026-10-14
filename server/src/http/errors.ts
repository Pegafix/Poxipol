import type { FastifyError, FastifyInstance } from 'fastify';
import { ZodError } from 'zod';

// Un error de la aplicación siempre trae un código estable que el cliente puede traducir y manejar.
export type ErrorCode =
  | 'VALIDATION_FAILED' | 'UNAUTHENTICATED' | 'TOKEN_EXPIRED' | 'FORBIDDEN' | 'NOT_FOUND'
  | 'VERSION_CONFLICT' | 'IDEMPOTENCY_MISMATCH' | 'ALREADY_EXISTS'
  | 'PET_ASLEEP' | 'PET_ON_PAUSE' | 'INSUFFICIENT_MATERIALS' | 'SKILL_REQUIRED' | 'SKILL_LOCKED'
  | 'NOT_ENOUGH_SKILL_POINTS' | 'TIMEZONE_COOLDOWN' | 'PAYLOAD_TOO_LARGE' | 'UNSUPPORTED_MEDIA'
  | 'RATE_LIMITED' | 'SYNC_CURSOR_EXPIRED' | 'DEPENDENCY_UNAVAILABLE' | 'INTERNAL';

export class AppError extends Error {
  constructor(
    readonly status: number,
    readonly code: ErrorCode,
    message: string,
    readonly details?: unknown,
    readonly retryAfterSeconds?: number
  ) {
    super(message);
  }
}

export const errors = {
  validation: (details: unknown) => new AppError(400, 'VALIDATION_FAILED', 'Los datos enviados no son válidos.', details),
  unauthenticated: (msg = 'Necesitas iniciar sesión.') => new AppError(401, 'UNAUTHENTICATED', msg),
  tokenExpired: () => new AppError(401, 'TOKEN_EXPIRED', 'El token de acceso venció. Renuévalo con el token de refresco.'),
  forbidden: (msg = 'No tienes acceso a esto.') => new AppError(403, 'FORBIDDEN', msg),
  notFound: (what: string) => new AppError(404, 'NOT_FOUND', `No existe ${what}.`),
  conflict: (current: unknown) => new AppError(409, 'VERSION_CONFLICT', 'Otro dispositivo cambió esto primero. Usa la versión actual y vuelve a intentar.', { current }),
  exists: (what: string) => new AppError(409, 'ALREADY_EXISTS', `${what} ya existe.`),
  rule: (code: ErrorCode, message: string, details?: unknown) => new AppError(422, code, message, details),
  rateLimited: (seconds: number) => new AppError(429, 'RATE_LIMITED', 'Demasiadas solicitudes. Espera un momento.', undefined, seconds),
  unavailable: () => new AppError(503, 'DEPENDENCY_UNAVAILABLE', 'Un servicio interno no responde. Reintenta en unos segundos.', undefined, 5)
};

// Manejo centralizado: toda respuesta de error tiene la misma forma y nunca deja al cliente esperando.
export function registerErrorHandling(app: FastifyInstance) {
  app.setErrorHandler((err: FastifyError | AppError | ZodError | Error, req, reply) => {
    let e: AppError;
    if (err instanceof AppError) e = err;
    else if (err instanceof ZodError) e = errors.validation(err.issues.map(i => ({ path: i.path.join('.'), message: i.message })));
    else if ((err as FastifyError).code === 'FST_ERR_CTP_BODY_TOO_LARGE') e = new AppError(413, 'PAYLOAD_TOO_LARGE', 'El archivo es demasiado grande.');
    else if ((err as FastifyError).code === 'FST_ERR_CTP_INVALID_MEDIA_TYPE') e = new AppError(415, 'UNSUPPORTED_MEDIA', 'Tipo de contenido no soportado.');
    else if ((err as FastifyError).validation) e = errors.validation((err as FastifyError).validation);
    else if ((err as FastifyError).statusCode && (err as FastifyError).statusCode! < 500) e = new AppError((err as FastifyError).statusCode!, 'VALIDATION_FAILED', err.message);
    else if (isDbUnavailable(err)) e = errors.unavailable();
    else {
      req.log.error({ err }, 'error no controlado');
      e = new AppError(500, 'INTERNAL', 'Ocurrió un error inesperado. Ya quedó registrado.');
    }
    if (e.retryAfterSeconds) reply.header('Retry-After', String(e.retryAfterSeconds));
    reply.status(e.status).send({ error: { code: e.code, message: e.message, details: e.details, requestId: req.id } });
  });
  app.setNotFoundHandler((req, reply) => {
    reply.status(404).send({ error: { code: 'NOT_FOUND', message: `No existe la ruta ${req.method} ${req.url}.`, requestId: req.id } });
  });
}

function isDbUnavailable(err: unknown) {
  const code = (err as { code?: string })?.code;
  // conexión rechazada, timeout de consulta, demasiadas conexiones, Postgres apagándose
  return code === 'ECONNREFUSED' || code === '57014' || code === '53300' || code === '57P01' || code === 'ETIMEDOUT';
}
