import { Router, Server } from 'symphony/http';

const server = new Server();

const api = new Router({ prefix: '/api' });

api.get('/', (request, response) => {
	response.send('Welcome to the API!');
});

api.get('/docs', (request, response) => {
	response.json({
		message: 'API documentation',
		routes: server.export(),
	});
});

server.include(api);

server.listen(3000, () => {
	console.log(`Server running on ${server.address.url}`);
});
