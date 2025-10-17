import { request } from 'undici';
import type { Server } from '@http/index';

/**
 * Realiza una petición HTTP al servidor usando undici.
 * @param server Instancia del servidor Synfonia
 * @param path Ruta relativa (por ejemplo '/test')
 * @param options Configuración adicional (método, body, headers)
 */
export async function makeRequest(
  server: Server,
  path: string,
  options: { method?: string; body?: any; headers?: Record<string, string> } = {}
) {
  const addr = server.address;
  if (!addr?.port) throw new Error('Server not listening');

  const res = await request(`http://127.0.0.1:${addr.port}${path}`, {
    method: options.method || 'GET',
    headers: options.headers,
    body:
      typeof options.body === 'object'
        ? JSON.stringify(options.body)
        : options.body,
  });

  return res;
}
