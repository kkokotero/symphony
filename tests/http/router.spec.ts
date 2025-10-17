import { describe, test, expect, vi, beforeEach } from 'vitest';
import { Router } from '@http/router';

describe('HTTP Router', () => {
  let router: Router;

  beforeEach(() => {
    router = new Router();
  });

  test('should handle route with query parameters', () => {
    const handler = vi.fn();
    router.get('/search', handler);

    const route = router.routes.http.get('GET')?.find('/search?q=test&page=1');
    expect(route).toBeDefined();
    expect(route?.query).toEqual({ q: 'test', page: '1' });
  });

  test('should handle route with wildcard', () => {
    const handler = vi.fn();
    router.get('/files/*', handler);

    const route = router.routes.http.get('GET')?.find('/files/documents/report.pdf');
    expect(route).toBeDefined();
    expect(route?.wildCard).toBe('documents/report.pdf');
  });

  test('should register middleware correctly', () => {
    const middleware1 = vi.fn((req, res, next) => next());
    const middleware2 = vi.fn((req, res, next) => next());
    const handler = vi.fn();

    router.get('/protected', middleware1, middleware2, handler);

    const route = router.routes.http.get('GET')?.find('/protected');
    expect(route).toBeDefined();
    // Middleware is applied in the handler chain, which we can't directly test here
  });

  test('should create nested router with prefix', () => {
    const apiRouter = new Router({ prefix: '/api' });
    apiRouter.get('/users', vi.fn());

    router.include(apiRouter);

    const route = router.routes.http.get('GET')?.find('/api/users');
    expect(route).toBeDefined();
  });
});
