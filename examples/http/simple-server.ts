import { Server } from 'synfonia/http';

const server = new Server();

server.get('/', (request, response) => {
	response.send('Hello, World!');
});

server.listen(3000, () => {
	console.log(`Server running on ${server.address.url}`);
});
