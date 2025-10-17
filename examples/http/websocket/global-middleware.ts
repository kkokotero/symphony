import { Server } from 'synfonia/http';
import type { WSMiddleware } from 'synfonia/types';

const server = new Server();

const globalMiddleware: WSMiddleware = (socket, request, next) => {
	console.log(`[${request.method}] ${request.url}`);
	next();
};

server.use('ws', globalMiddleware);

server.ws('/', (socket, request) => {
	socket.send('Hello, World!');
});

server.ws('/about', (socket, request) => {
	socket.send({ message: 'About page', version: '1.0.0' });
});

server.listen(3000, () => {
	console.log(`Server running on ${server.address.url}`);
});
