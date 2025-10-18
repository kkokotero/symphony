import { parseSocketMessage, WebSocketServer } from 'synphony/ws';

const wss = new WebSocketServer();

wss.on('connection', (socket) => {
	socket.send('Hello, World!');

	socket.on('message', (data) => {
		socket.send({ message: parseSocketMessage(data) });
	});
});

wss.listen(8080, () => {
	console.log(`WebSocket server running on ${wss.address.url}`);
});
