import Fastify from 'fastify';

const app = Fastify();

app.get('/', async () => {
	return 'ok';
});

app.listen({ port: 3000 }).then(() => {
	console.log('Fastify running on 3000');
});
