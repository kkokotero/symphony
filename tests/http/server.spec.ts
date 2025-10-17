import { describe, test, beforeAll, afterAll, expect } from 'vitest';
import { Server } from '@http/index';
import { makeRequest } from '../helpers/simulate';
import { json } from '@src/plugins/http';

describe('HTTP Server', () => {
  let server: Server;

  beforeAll(() => {
    server = new Server();

    server.get('/', (req, res) => res.send('Hello World'));

    server.post('/echo', json(), async (req, res) => {
      const body = req.body;
      res.json({ received: body });
    });

    server.put('/update', (req, res) => {
      res.status(204).send('');
    });

    server.delete('/item', (req, res) => {
      res.status(200).send('Deleted');
    });

    server.get('/headers', (req, res) => {
      res.setHeaders({'X-Custom': 'TestHeader'});
      res.send('ok');
    });

    server.listen(0);
  });

  afterAll(() => {
    server.close();
  });

  test('should respond to GET /', async () => {
    const res = await makeRequest(server, '/');
    expect(res.statusCode).toBe(200);
    expect(await res.body.text()).toBe('Hello World');
  });

  test('should return 404 for unknown routes', async () => {
    const res = await makeRequest(server, '/unknown');
    expect(res.statusCode).toBe(404);
  });

  test('should handle POST /echo and return JSON body', async () => {
    const res = await makeRequest(server, '/echo', {
      method: 'POST',
      body: JSON.stringify({ msg: 'hi' }),
      headers: { 'Content-Type': 'application/json' },
    });

    expect(res.statusCode).toBe(200);
    const data = await res.body.json();
    expect(data).toEqual({ received: { msg: 'hi' } });
  });

  test('should handle PUT /update with 204 No Content', async () => {
    const res = await makeRequest(server, '/update', { method: 'PUT' });
    expect(res.statusCode).toBe(204);
    expect(await res.body.text()).toBe('');
  });

  test('should handle DELETE /item', async () => {
    const res = await makeRequest(server, '/item', { method: 'DELETE' });
    expect(res.statusCode).toBe(200);
    expect(await res.body.text()).toBe('Deleted');
  });

  test('should set custom headers', async () => {
    const res = await makeRequest(server, '/headers');
    expect(res.statusCode).toBe(200);
    expect(res.headers['x-custom']).toBe('TestHeader');
  });

  test('should include correct address info', () => {
    const addr = server.address;
    expect(addr).toBeDefined();
    expect(typeof addr.port).toBe('number');
  });

  test('should close the server properly', async () => {
    server.close();
    await expect(makeRequest(server, '/')).rejects.toThrow();
  });
});
