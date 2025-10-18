import { Server } from 'synphony/http';

const server = new Server();

server.get('/*', (request, response) => {
	response.status(404).send('Route not found.');
});

server.get('/', (request, response) => {
	response.send('Static route: no parameters.');
});

server.get('/pages/:page', (request, response) => {
	const { page } = request.params;
	response.send(`Dynamic route: current page is "${page}".`);
});

server.get('/files/*', (request, response) => {
	response.send(`Wildcard route: requested path "${request.wildCard}".`);
});

server.get('/search', (request, response) => {
	const { q = null, page = '1' } = request.queries;
	response.json({
		message: 'Search route with query params',
		query: q,
		page: Number(page),
	});
});

server.listen(3000, () => {
	console.log(`Server running at ${server.address.url}`);
});
