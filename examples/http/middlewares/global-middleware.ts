import { Server } from 'symphony/http';
import type { Middleware } from 'symphony/types';

const server = new Server();

const globalMiddleware: Middleware = (request, response, next) => {
	console.log(`[${request.method}] ${request.url}`);
	next();
};

server.use('http', globalMiddleware);

server.get('/', (request, response) => {
	response.send('Hello, World!');
});

server.get('/about', (request, response) => {
	response.json({ message: 'About page', version: '1.0.0' });
});

server.listen(3000, () => {
	console.log(`Server running on ${server.address.url}`);
});
