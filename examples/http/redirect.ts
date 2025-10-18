import { Server } from 'synphony/http';

const server = new Server();

server.get('/', (request, response) => {
  response.redirect('/home');
});

server.get('/home', (request, response) => {
  response.send('Welcome home!');
});

server.listen(3000, () => {
	console.log(`Server running on ${server.address.url}`);
});
