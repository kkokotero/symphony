import { describe, test, beforeAll, afterAll, expect } from 'vitest';
import { Server } from '@http/index';
import { makeRequest } from '../helpers/simulate';

describe('Middlewares', () => {
	let server: Server;

	beforeAll(() => {
		server = new Server();

		// Middleware global HTTP
		server.use('http', (req, res, next) => {
			req.headers['x-modified'] = 'true';
			next();
		});

		// Middleware que agrega contexto
		server.use('http', (req, res, next) => {
			(req as any).context = { time: 'now' };
			next();
		});

		// Middleware que corta la cadena
		server.use('http', (req, res, next) => {
			if (req.url === '/blocked') {
				res.status(403).send('Blocked');
				return; // No llama a next()
			}
			next();
		});

		// Middleware que lanza error
		server.use('http', (req, res, next) => {
			if (req.url === '/error') {
				throw new Error('Middleware failed');
			}
			next();
		});

		// Middleware de ruta específica
		server.use('http', (req, res, next) => {
			if (req.url === '/private') req.headers['x-private'] = 'yes';
			next();
		});

		// Rutas
		server.get('/test', (req, res) => {
			res.send(req.headers['x-modified'] ? 'ok' : 'fail');
		});

		server.get('/context', (req, res) => {
			res.json((req as any).context);
		});

		server.get('/blocked', () => {
			// Nunca debe llegar aquí
			throw new Error('Should not reach this handler');
		});

		server.get('/private', (req, res) => {
			res.send(req.headers['x-private'] ? 'authorized' : 'unauthorized');
		});

		server.get('/error', () => {
			// Si el middleware lanza error, esto no debería ejecutarse
			throw new Error('Should not reach route');
		});

		server.listen(0);
	});

	afterAll(() => server.close());

	// ---------------- TESTS ----------------

	test('should pass through middleware', async () => {
		const res = await makeRequest(server, '/test');
		expect(res.statusCode).toBe(200);
		expect(await res.body.text()).toBe('ok');
	});

	test('should attach custom context from middleware', async () => {
		const res = await makeRequest(server, '/context');
		expect(res.statusCode).toBe(200);
		const data = await res.body.json();
		expect(data).toEqual({ time: 'now' });
	});

	test('should stop chain when middleware sends response', async () => {
		const res = await makeRequest(server, '/blocked');
		expect(res.statusCode).toBe(403);
		expect(await res.body.text()).toBe('Blocked');
	});

	test('should apply middleware for specific route', async () => {
		const res = await makeRequest(server, '/private');
		expect(res.statusCode).toBe(200);
		expect(await res.body.text()).toBe('authorized');
	});

	test('should execute middlewares in correct order', async () => {
		const order: string[] = [];
		const localServer = new Server();

		localServer.use('http', (req, res, next) => {
			order.push('1');
			next();
		});

		localServer.use('http', (req, res, next) => {
			order.push('2');
			next();
		});

		localServer.get('/', (req, res) => {
			order.push('3');
			res.send('done');
		});

		localServer.listen(0);
		const res = await makeRequest(localServer, '/');
		expect(res.statusCode).toBe(200);
		expect(order).toEqual(['1', '2', '3']);
		localServer.close();
	});

	test('should not crash if next() called multiple times', async () => {
		const srv = new Server();
		srv.use('http', (req, res, next) => {
			next();
			next(); // llamado doble no debería romper el flujo
		});
		srv.get('/', (req, res) => res.send('safe'));
		srv.listen(0);
		const res = await makeRequest(srv, '/');
		expect(res.statusCode).toBe(200);
		expect(await res.body.text()).toBe('safe');
		srv.close();
	});
});
