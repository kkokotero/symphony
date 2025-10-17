import type { WSMiddleware } from '@src/types';
import { WebSocketServer } from 'symphony/ws';

const wss = new WebSocketServer();

const logger: WSMiddleware = (socket, request, next) => {
	console.log(`[${request.method}] ${request.url}`);
	next();
};

wss.route('/*', logger, (socket) => {
	socket.send('Hello, World!');
});

wss.listen(3000, () => {
	console.log(`wss running at ${wss.address.url}`);
});
