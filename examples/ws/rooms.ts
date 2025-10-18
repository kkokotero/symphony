import { WebSocketServer } from 'synphony/ws';

const wss = new WebSocketServer();

wss.route('/room/:room', (socket, request) => {
	const { room = 'general' } = request.params;

	socket.join(`rooms-${room}`, (room) => {
		room.send({ size: room.size, user: socket.id, message: 'Hello!' });

		room.on('message', (data) => {
			socket.send(data);
		});

		room.on('join', (roommate) => {
			socket.send({ size: room.size, join: roommate.id });
		});

		room.on('leave', (roommate) => {
			socket.send({ size: room.size, leave: roommate.id });
		});
	});
});

wss.listen(8080, () => {
	console.log(`WebSocket server running on ${wss.address.url}`);
});
