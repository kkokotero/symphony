import { Server } from 'symphony/http';
import type { Middleware } from 'symphony/types';

const server = new Server();

const logger: Middleware = (request, response, next) => {
  console.log(`[${request.method}] ${request.url}`);
  next();
};

server.get('/', logger, (request, response) => {
  response.send('Hello, World!');
});

server.listen(3000, () => {
  console.log(`Server running on ${server.address.url}`);
});
