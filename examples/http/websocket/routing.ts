import { Server } from 'synfonia/http';

const server = new Server();

server.ws('/', (socket, request) => {
	socket.send('Static route: no parameters.');
});

server.ws('/pages/:page', (socket, request) => {
	const { page } = request.params;
	socket.send(`Dynamic route: current page is "${page}".`);
});

server.ws('/files/*', (socket, request) => {
	socket.send(`Wildcard route: requested path "${request.wildCard}".`);
});

server.ws('/search', (socket, request) => {
	const { q = null, page = '1' } = request.queries;
	socket.send({
		message: 'Search route with query params',
		query: q,
		page: Number(page),
	});
});

server.listen(3000, () => {
	console.log(`Server running at ${server.address.url}`);
});
