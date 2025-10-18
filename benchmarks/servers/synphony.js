import { Server } from 'synphony/http';

const app = new Server();

app.get('/', (_, res) => {
	res.send('Hello world!');
});

app.listen(3000, () => {
	console.log('Synphony running on 3000');
});
