import { resolve } from 'node:path';
import { Server } from 'synfonia/http';

const server = new Server();

server.get('/download/*', (request, response) => {
  response.download(resolve(process.cwd(), request.wildCard));
});

server.get('/view/*', (request, response) => {
  response.file(resolve(process.cwd(), request.wildCard));
});

server.listen(3000, () => {
  console.log(`Server running on ${server.address.url}`);
});
