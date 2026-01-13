import fs                 from 'fs';
import path, { dirname }  from 'path';
import Fastify            from 'fastify';
import fastifyStatic      from '@fastify/static';
import { fileURLToPath }  from 'url';

const __filename  = fileURLToPath(import.meta.url);
const __dirname   = dirname(__filename);

const httpsOptions = {
  key:  fs.readFileSync('/certs/server.key'),
  cert: fs.readFileSync('/certs/server.crt'),
};

const PORT: number = Number(process.env.PORT) || 3001;
const fastify = Fastify({ logger: true, https: httpsOptions });

fastify.register(fastifyStatic, {
  root:   path.join(__dirname),
  prefix: '/',
});

fastify.setNotFoundHandler((request, reply) => {
  if (!path.extname(request.raw.url || '')) {
    reply.type('text/html').sendFile('index.html');
  } else {
    reply.status(404).send('Not found');
  }
});

fastify.listen({ port: PORT, host: '0.0.0.0' }, (err, address) => {
  if (err) {
    fastify.log.error(err);
    process.exit(1);
  }
  // fastify.log.info(`Server listening at ${address}`);
});
