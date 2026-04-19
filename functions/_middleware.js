/**
 * Pages Functions middleware — CORS + shared helpers.
 * Runs before every /api/* function.
 */

const ALLOWED_ORIGINS = ['https://tunnelmind.ai', 'https://alloy.tunnelmind.ai', 'http://localhost:5173', 'http://localhost:5174']

export async function onRequest({ request, next, env }) {
  const origin = request.headers.get('Origin') || ''
  const allowed = ALLOWED_ORIGINS.includes(origin)

  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders(allowed ? origin : ''),
    })
  }

  const resp = await next()

  // Clone and add CORS headers to every API response
  const headers = new Headers(resp.headers)
  if (allowed) {
    headers.set('Access-Control-Allow-Origin', origin)
    headers.set('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS')
    headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    headers.set('Vary', 'Origin')
  }
  return new Response(resp.body, { status: resp.status, headers })
}

function corsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Vary': 'Origin',
  }
}
