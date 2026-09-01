import { serve } from 'bun';
import { handleRequest, db, jwtService } from './server';
import { getConfig } from './config';
import { logger } from './utils/logger';
import { withRequestLogging } from './middleware/requestLogger';

const config = getConfig();

// Wrap the request handler with logging
const loggedHandleRequest = withRequestLogging(handleRequest, jwtService, db);

const server = serve({
  port: config.server.port,
  fetch: loggedHandleRequest,
});

// Graceful shutdown: stop accepting connections, flush sessions, close SQLite.
// docker stop sends SIGTERM — without this, the DB can lose its WAL on stop.
let shuttingDown = false;
async function shutdown(signal: string): Promise<never> {
  if (shuttingDown) process.exit(0);
  shuttingDown = true;
  logger.info(`${signal} received — shutting down`);
  server.stop(true);
  try {
    db.close();
  } catch (error) {
    logger.error('Error closing database during shutdown', { error });
  }
  process.exit(0);
}

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));

logger.info(`🚀 Fam Mail backend running on http://localhost:${config.server.port}`);
