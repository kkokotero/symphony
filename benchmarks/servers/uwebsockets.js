import uWS from 'uwebsockets';

uWS.App()
  .get('/', (res) => {
    res.end('ok');
  })
  .listen(3000, () => {
    console.log('uWebSockets.js running on 3000');
  });
