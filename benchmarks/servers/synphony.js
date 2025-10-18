import { Server } from 'synphony/http';

const app = new Server();

app.get('/', async (_, res) => {
	res.send('ok');
});

app.listen(3000, () => {
	console.log('Synphony running on 3000');
});
