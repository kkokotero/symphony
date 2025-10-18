import polka from 'polka';

polka()
  .get('/', (req, res) => res.end('ok'))
  .listen(3000, () => console.log('Polka running on 3000'));
