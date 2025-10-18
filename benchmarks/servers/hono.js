import { serve } from '@hono/node-server';
import { Hono } from 'hono';

const app = new Hono();

app.get('/', (c) => {
	c.text('ok');
});

serve({ fetch: app.fetch, port: 3000 });
console.log('Hono running on 3000');
