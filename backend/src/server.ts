import { join } from 'path';
import { file } from 'bun';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const isProduction = process.env.NODE_ENV === 'production';
const frontendDistPath = join(import.meta.dir, '../../frontend/dist');

export async function handleRequest(req: Request): Promise<Response> {
  const url = new URL(req.url);
  
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  if (url.pathname === '/api/health') {
    return new Response(
      JSON.stringify({
        status: 'ok',
        timestamp: new Date().toISOString(),
        message: 'Fam Mail backend is running',
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );
  }

  if (url.pathname === '/api/test') {
    return new Response(
      JSON.stringify({
        message: 'Hello from Fam Mail backend!',
        connected: true,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );
  }

  if (isProduction && !url.pathname.startsWith('/api')) {
    try {
      const filePath = join(frontendDistPath, url.pathname);
      
      const bunFile = file(filePath);
      if (await bunFile.exists()) {
        return new Response(bunFile);
      }
      
      const indexFile = file(join(frontendDistPath, 'index.html'));
      if (await indexFile.exists()) {
        return new Response(indexFile);
      }
    } catch (error) {
      console.error('Error serving static file:', error);
    }
  }

  return new Response(
    JSON.stringify({ error: 'Not Found' }),
    {
      status: 404,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    }
  );
}
