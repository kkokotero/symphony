import { Server } from 'synphony/http';

const server = new Server();

server.group('/api', (api) => {
  api.get('/', (request, response) => {
    response.send('Welcome to the API!');
  });

  api.get('/docs', (request, response) => {
    response.json({
      message: 'API documentation',
      routes: server.export(),
    });
  });
})

server.listen(3000, () => {
  console.log(`Server running on ${server.address.url}`);
});
