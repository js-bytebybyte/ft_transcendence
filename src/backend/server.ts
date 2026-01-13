import Fastify, {FastifyInstance} from "fastify";
import fastifyCookie from "@fastify/cookie";
import fastifyJwt from '@fastify/jwt';
import cors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import multipart from '@fastify/multipart';
import oauth2 from '@fastify/oauth2';
//import {db} from "./src/database.js";
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
import  userRoutes  from "./src/Routes/userRoutes.js";
import pongRoutes from "./src/Routes/pongRoutes.js";
import fastifyWebsocket from '@fastify/websocket';
import messagingRoutes from './src/Routes/MessagingRoutes.js';
import { createChatBot } from './src/services/userService.js';

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

// console.log(`voici mon addresse host backend = ${HOST}`);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const httpsOptions = {
  key: fs.readFileSync('/certs/server.key'),
  cert: fs.readFileSync('/certs/server.crt'),
};
const server: FastifyInstance = Fastify({
    logger: false,
    https:  httpsOptions,
});

async function registerRoutes(){
    //const userRoutes = require('./src/Routes/userRoutes').default;

    await server.register(async (instance) => {
        instance.register(userRoutes, {prefix: '/api'});
        instance.register(pongRoutes, {prefix: '/api'});
        instance.register(messagingRoutes, {prefix: '/api'});
    });
    
}

async function registerPlugin(){
    
    await server.register(cors, {
        origin : [
            'https://localhost:3001', 'https://127.0.0.1:3001', // HTTPS
            'http://localhost:3001',  'http://127.0.0.1:3001',
            'https://127.18.0.2:3001', 'http://127.18.0.2:3001',
            'https://172.18.0.2:3001', 'http://172.18.0.2:3001',
            'https://10.3.2.7:3001',  'http://10.3.2.7:3001' // HTTP
        ],
        methods: ['GET', 'POST', 'DELETE', 'PUT', 'OPTIONS'],
        credentials: true,
        allowedHeaders: ['Content-Type', 'Authorization', 'credentials'],
        preflight: true
    });
    await server.register(fastifyCookie);
    await server.register(fastifyJwt, {
        secret: process.env.JWTS || 'secretPhrase',
        cookie: {
            cookieName: 'jwt',
            signed: false
        }
    });
    await server.register(fastifyStatic, {
        root: path.join(__dirname, 'src', 'Routes', 'uploads'), // chemin réel du dossier images
        prefix: '/uploads/',
    });
    await server.register(multipart);
    await server.register(fastifyWebsocket);

    await server.register(oauth2 as any, {
        name: 'googleOAuth2',
        credentials: {
            client: {
                id: process.env.CLIENT_ID,
                secret: process.env.CLIENT_SECRET
            },
            auth: {
                authorizeHost: 'https://accounts.google.com',
                authorizePath: '/o/oauth2/v2/auth',
                tokenHost: 'https://oauth2.googleapis.com',
                tokenPath: '/token'
            }
        },
        scope: ['profile', 'email'],
        startRedirectPath: '/login/google',
        callbackUri: (process.env.NODE_ENV === 'production' ? "https://" : "http://") + "localhost:3000/api/login/google/callback"
    });
}

async function start(){
    try{
        // will register all plugins, including CORS, JWT , Cookies and Socket.IO
        await registerPlugin();

        // will register the Pong API routes including the game state
        await registerRoutes();

        // server.addHook('onRequest', (request, reply, done) => {
        //     reply.header('Access-Control-Allow-Origin', request.headers.origin || '*');
        //     reply.header('Access-Control-Allow-Credentials', 'true');
        //     done();
        // });

        await server.listen({port : Number(PORT), host: HOST});
        // console.log(`Server backend démarré sur ${HOST}:${PORT}`);
        const chatBotId = await createChatBot({
            username : "ChatBot",
            password : "ChatBot",
            email : "ChatBot",
            avatar_url : "ChatBot",
            auth_provider : "ChatBot"
        });
        // console.log(`ChatBot ID : ${chatBotId}`)
    }
    catch(err)
    {
        server.log.error(err);
        process.exit(1);
    }
}

start();
