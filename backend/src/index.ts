import { serve } from 'bun';
import { handleRequest, db, jwtService } from './server';
import { getConfig } from './config';
import { logger } from './utils/logger';
import { withRequestLogging } from './middleware/requestLogger';

const config = getConfig();

// Wrap the request handler with logging
const loggedHandleRequest = withRequestLogging(handleRequest, jwtService, db);

serve({
  port: config.server.port,
  fetch: loggedHandleRequest,
});

logger.info(`🚀 Fam Mail backend running on http://localhost:${config.server.port}`);
