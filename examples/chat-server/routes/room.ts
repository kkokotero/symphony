import { parseSocketMessage } from '@src/ws';
import { Router } from 'symphony/http';

export const roomRoutes = new Router({ prefix: 'room' });

roomRoutes.ws('/classification', (socket) => {
	const calc = () =>
		Object.fromEntries(
			Array.from(socket.rooms, ([key, value]) => [key, value.size]),
		);

	socket.send(calc());
	const interval = setInterval(() => {
		socket.send(calc());
	}, 1000);

	interval.unref();

	socket.on('close', () => clearInterval(interval));
});

roomRoutes.ws('/:room', (socket, request) => {
	const { room = 'general' } = request.params;

	socket.join(`rooms-${room}`, (room) => {
		socket.send({
			type: 'sync',
			roommates: Array.from(room.roommates.values()).map((v) => v.id),
		});

		room.on('message', (data) => {
			socket.send(data);
		});

		room.on('join', (roommate) => {
			socket.send({ type: 'join', id: roommate.id });
		});

		room.on('leave', (roommate) => {
			socket.send({ type: 'leave', id: roommate.id });
		});

		socket.on('message', (data) => {
			const recived = parseSocketMessage(data);
			if (typeof recived === 'object' && (recived as any).event) {
				return room.send({ type: (recived as any).event, id: socket.id });
			}
			room.send({ type: 'message', data: { id: socket.id, message: recived } });
		});
	});
});
