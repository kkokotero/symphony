import { resolve } from 'node:path';
import { Server } from 'symphony/http';
import { roomRoutes } from './routes/room';

const server = new Server({ roomCleanupDelay: 5000 });

server.static('/*', resolve(__dirname, 'public'));

server.include(roomRoutes);

server.listen(3000, () => {
	console.log(`Server running on ${server.address.url}`);
});
