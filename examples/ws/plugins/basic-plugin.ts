import type { Plugin } from 'symphony/types';
import { WebSocketServer } from 'symphony/ws';

const wss = new WebSocketServer();

const logger: Plugin<WebSocketServer> = (wss) => {
	wss.use((socket, request, next) => {
		console.log(`[${request.method}] ${request.url}`);
		next();
	});

	wss.on('connection', (socket) => {
		console.log(`New connection: ${socket.id}`);
	});
};

wss.plugin(logger);

wss.on('connection', (socket) => {
	socket.send('Hello, World!');

	socket.on('message', () => {
		socket.send('I got your message!');
	});
});

wss.listen(8080, () => {
	console.log(`WebSocket server running on ${wss.address.url}`);
});
