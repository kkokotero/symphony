import { Server } from 'synfonia/http';

const server = new Server();

server.static('/*', process.cwd());

server.listen(3000, () => {
  console.log(`Server running on ${server.address.url}`);
});
