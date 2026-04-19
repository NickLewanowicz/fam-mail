/**
 * Lightweight structured logger for the backend.
 *
 * Uses Bun's built-in console for output but provides:
 *   - Log level filtering (debug, info, warn, error)
 *   - Structured context objects
 *   - Consistent formatting
 *
 * Log level is controlled via the LOG_LEVEL env var (default: "info").
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
}

function getPriority(level: LogLevel): number {
  return LEVEL_PRIORITY[level] ?? LEVEL_PRIORITY.info
}

function resolveLogLevel(): LogLevel {
  const envLevel = process.env.LOG_LEVEL?.toLowerCase()
  if (envLevel && envLevel in LEVEL_PRIORITY) {
    return envLevel as LogLevel
  }
  return 'info'
}

function formatMessage(level: LogLevel, message: string, context?: Record<string, unknown>): string {
  const timestamp = new Date().toISOString()
  const base = `${timestamp} [${level.toUpperCase()}] ${message}`
  if (context && Object.keys(context).length > 0) {
    return `${base} ${JSON.stringify(context)}`
  }
  return base
}

class Logger {
  private minLevel: number

  constructor(level?: LogLevel) {
    this.minLevel = getPriority(level ?? resolveLogLevel())
  }

  debug(message: string, context?: Record<string, unknown>): void {
    if (this.minLevel <= LEVEL_PRIORITY.debug) {
      console.debug(formatMessage('debug', message, context))
    }
  }

  info(message: string, context?: Record<string, unknown>): void {
    if (this.minLevel <= LEVEL_PRIORITY.info) {
      console.info(formatMessage('info', message, context))
    }
  }

  warn(message: string, context?: Record<string, unknown>): void {
    if (this.minLevel <= LEVEL_PRIORITY.warn) {
      console.warn(formatMessage('warn', message, context))
    }
  }

  error(message: string, context?: Record<string, unknown>): void {
    if (this.minLevel <= LEVEL_PRIORITY.error) {
      console.error(formatMessage('error', message, context))
    }
  }
}

/** Default logger instance used throughout the backend. */
export const logger = new Logger()

/** Create a child logger with an explicit level (useful for tests). */
export function createLogger(level?: LogLevel): Logger {
  return new Logger(level)
}
