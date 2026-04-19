import { serve } from 'bun';
import { handleRequest } from './server';
import { getConfig } from './config';
import { logger } from './utils/logger';

const config = getConfig();

serve({
  port: config.server.port,
  fetch: handleRequest,
});

logger.info(`🚀 Fam Mail backend running on http://localhost:${config.server.port}`);
