import { Server } from 'symphony/http';

const server = new Server();

server.get('/', (request, response) => {
	response.send('Hello, World!');
});

server.ws('/*', (socket, request) => {
	socket.send(`You're connected in: ${request.wildCard}`);
});

server.listen(3000, () => {
	console.log(`Server running on ${server.address.url}`);
});
