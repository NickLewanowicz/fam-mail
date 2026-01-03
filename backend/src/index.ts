import { serve } from 'bun';
import { handleRequest } from './server';
import { getConfig } from './config';

const config = getConfig();

serve({
  port: config.server.port,
  fetch: handleRequest,
});

console.log(`🚀 Fam Mail backend running on http://localhost:${config.server.port}`);
