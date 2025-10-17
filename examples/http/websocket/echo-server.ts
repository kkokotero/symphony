import { Server } from 'symphony/http';
import { parseSocketMessage } from 'symphony/ws';

const server = new Server();

server.webSocketManager?.on('connection', (socket) => {
	socket.on('message', (data) => {
		socket.send(parseSocketMessage(data));
	});
});

server.listen(3000, () => {
	console.log(`Server running on ${server.address.url}`);
});
