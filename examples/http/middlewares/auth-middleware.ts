import { Server } from 'synfonia/http';
import type { Middleware } from 'synfonia/types';

const server = new Server();

const auth: Middleware = (request, response, next) => {
	const token = request.headers.authorization;
	if (token !== 'secret') {
    return response.status(401).send('Unauthorized');
	}
  next();
};

server.get('/', auth, (request, response) => {
	response.send('Hello, World!');
});

server.listen(3000, () => {
	console.log(`Server running on ${server.address.url}`);
});
