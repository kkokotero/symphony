import { Server } from 'symphony/http';
import type { WSMiddleware } from 'symphony/types';

const server = new Server();

const logger: WSMiddleware = (socket, request, next) => {
  console.log(`[${request.method}] ${request.url}`);
  next();
};

server.ws('/', logger, (socket, request)  => {
  socket.send('Hello, World!');
});

server.listen(3000, () => {
  console.log(`Server running on ${server.address.url}`);
});
