import { describe, test, beforeAll, afterAll, expect } from 'vitest';
import { Server } from '../../src/http/index';
import { makeRequest } from '../helpers/simulate';

describe('Routing', () => {
  let server: Server;

  beforeAll(() => {
    server = new Server();

    // Rutas con parámetros
    server.get('/users/:id', (req, res) => res.json({ id: req.params.id }));

    // Ruta anidada
    server.get('/users/:id/posts/:postId', (req, res) =>
      res.json({ user: req.params.id, post: req.params.postId })
    );

    // Ruta con comodín
    server.get('/files/*', (req, res) => res.json({ path: req.wildCard }));

    // Ruta estática que debe tener prioridad sobre dinámica
    server.get('/users/list', (req, res) => res.send('User List'));

    // Ruta con query params
    server.get('/search', (req, res) => res.json({ query: req.queries }));

    // Ruta sin coincidencia
    server.get('/nothing', (req, res) => res.send('ok'));

    server.listen(0);
  });

  afterAll(() => {
    server.close();
  });

  test('should extract dynamic params', async () => {
    const res = await makeRequest(server, '/users/42');
    expect(res.statusCode).toBe(200);
    expect(await res.body.json()).toEqual({ id: '42' });
  });

  test('should extract multiple dynamic params', async () => {
    const res = await makeRequest(server, '/users/10/posts/99');
    expect(res.statusCode).toBe(200);
    expect(await res.body.json()).toEqual({ user: '10', post: '99' });
  });

  test('should handle wildcard routes', async () => {
    const res = await makeRequest(server, '/files/path/to/file.txt');
    expect(res.statusCode).toBe(200);
    expect(await res.body.json()).toEqual({ path: 'path/to/file.txt' });
  });

  test('should prefer static route over dynamic', async () => {
    const res = await makeRequest(server, '/users/list');
    expect(res.statusCode).toBe(200);
    expect(await res.body.text()).toBe('User List');
  });

  test('should parse query parameters', async () => {
    const res = await makeRequest(server, '/search?term=test&page=2');
    expect(res.statusCode).toBe(200);
    const data = await res.body.json() as Record<string, string>;
    expect(data.query).toEqual({ term: 'test', page: '2' });
  });

  test('should return 404 for unmatched dynamic routes', async () => {
    const res = await makeRequest(server, '/users');
    expect(res.statusCode).toBe(404);
  });

  test('should not confuse similar routes', async () => {
    const res = await makeRequest(server, '/nothing');
    expect(res.statusCode).toBe(200);
    expect(await res.body.text()).toBe('ok');
  });

  test('should handle URL encoded params correctly', async () => {
    const encoded = encodeURIComponent('john doe');
    const res = await makeRequest(server, `/users/${encoded}`);
    const data = await res.body.json();
    expect(data).toEqual({ id: 'john doe' });
  });

  test('should ignore trailing slashes when matching routes', async () => {
    const res = await makeRequest(server, '/users/123/');
    expect(res.statusCode).toBe(200);
    expect(await res.body.json()).toEqual({ id: '123' });
  });
});
