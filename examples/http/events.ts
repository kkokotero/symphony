import { Server } from 'symphony/http';

const server = new Server();

server.on('request', (req) => {
	console.log(`${req.method} ${req.url}`);
});

server.listen(3000, () => {
  console.log(`Server running on ${server.address.url}`);
});
