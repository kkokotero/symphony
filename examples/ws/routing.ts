import { WebSocketServer } from 'synphony/ws';

const wss = new WebSocketServer();

wss.route('/', (socket) => {
  socket.send('Static route: no parameters.');
});

wss.route('/pages/:page', (socket, request) => {
  const { page } = request.params;
  socket.send(`Dynamic route: current page is "${page}".`);
});

wss.route('/files/*', (socket, request) => {
  socket.send(`Wildcard route: requested path "${request.wildCard}".`);
});

wss.route('/search', (socket, request) => {
  const { q = null, page = '1' } = request.queries;
  socket.send({
    message: 'Search route with query params',
    query: q,
    page: Number(page),
  });
});

wss.listen(3000, () => {
  console.log(`wss running at ${wss.address.url}`);
});
