import { serve } from 'bun';
import { handleRequest } from './server';

const isProduction = process.env.NODE_ENV === 'production';
const PORT = process.env.PORT || (isProduction ? 3000 : 3001);

serve({
  port: PORT,
  fetch: handleRequest,
});

console.log(`🚀 Fam Mail backend running on http://localhost:${PORT}`);
