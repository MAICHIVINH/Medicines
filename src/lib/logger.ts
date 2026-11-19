const REDACTED_KEYS = new Set([
  'password',
  'passwordhash',
  'newpassword',
  'oldpassword',
  'currentpassword',
  'secret',
  'auth_secret',
  'aws_secret_access_key',
  'aws_access_key_id',
  'token',
  'accesstoken',
  'refreshtoken',
  'authorization',
]);

export function sanitizeForLog(input: unknown): unknown {
  if (input === null || input === undefined) {
    return input;
  }

  if (Array.isArray(input)) {
    return input.map(sanitizeForLog);
  }

  if (typeof input === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
      if (REDACTED_KEYS.has(key.toLowerCase())) {
        result[key] = '[REDACTED]';
      } else {
        result[key] = sanitizeForLog(value);
      }
    }
    return result;
  }

  return input;
}

export const logger = {
  info(message: string, meta?: Record<string, unknown>) {
    console.log(
      JSON.stringify({
        level: 'INFO',
        timestamp: new Date().toISOString(),
        message,
        ...(meta ? { meta: sanitizeForLog(meta) } : {}),
      })
    );
  },
  warn(message: string, meta?: Record<string, unknown>) {
    console.warn(
      JSON.stringify({
        level: 'WARN',
        timestamp: new Date().toISOString(),
        message,
        ...(meta ? { meta: sanitizeForLog(meta) } : {}),
      })
    );
  },
  error(message: string, error?: unknown, meta?: Record<string, unknown>) {
    const errorInfo =
      error instanceof Error
        ? {
            name: error.name,
            message: error.message,
            ...(process.env.NODE_ENV !== 'production' ? { stack: error.stack } : {}),
          }
        : { raw: String(error) };

    console.error(
      JSON.stringify({
        level: 'ERROR',
        timestamp: new Date().toISOString(),
        message,
        error: errorInfo,
        ...(meta ? { meta: sanitizeForLog(meta) } : {}),
      })
    );
  },
};

