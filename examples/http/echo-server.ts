import { Server } from 'symphony/http';
import { parseBody } from 'symphony/plugins';

const server = new Server();

server.plugin(parseBody);

server.post('/*', (request, response) => {
  response.send(request.body);
});

server.listen(3000, () => {
  console.log(`Server running on ${server.address.url}`);
});
