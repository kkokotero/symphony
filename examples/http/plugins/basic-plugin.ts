import { Server } from 'synfonia/http';
import type { Plugin } from 'synfonia/types';

const server = new Server();

const autoDoc: Plugin<Server> = (server) => {
	server.get('/docs', (request, response) => {
		response.json({
			message: 'API documentation',
			routes: server.export(),
		});
	});

	server.on('listening', () => {
		console.log(`Docs generated on ${server.address.url}/docs`);
	});
};

server.plugin(autoDoc)

server.get('/', (request, response) => {
	response.send('Hello, World!');
});

server.listen(3000, () => {
	console.log(`Server running on ${server.address.url}`);
});
