import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
//import { SocketStream } from "@fastify/websocket";
import { getAllMsgAndConv, createNewMessageDb } from "../services/messagingService.js";
import { Conversation, Message, createConversation, deleteConversation, getallMsgFromConv, checkIfConversationExists } from "../services/messagingService.js";
import { getUserByUsername, getUserById, updateUserLastSeen, updateUserOnlineStatus } from "../services/userService.js";

interface ChatQuery {
    query : {
    userId: string;
    }
}

interface UserIdParam {
    Params: {
      id: string;
    }
}
const clients = new Map<string, import('ws').WebSocket>();

export function broadcast_message(userId : string, message : string, type : string){
    //(`Broadcasting message to ${userId}: ${message}`);
    for (const [clientId, client] of clients.entries()) {
        //console.log(`Client ID: ${clientId}`);
        if (clientId != userId && client.readyState === client.OPEN) {
            client.send(JSON.stringify({type : type, newUserId : userId, message : message}));
        }
    }
}
export default async function messagingRoutes(fastify: FastifyInstance){
    fastify.get('/ws/chat', {websocket: true}, async (socket, req : FastifyRequest)=>{
        //console.log("✅ Client connected via CHAT WebSocket");
        
        const {userId }= req.query as ChatQuery['query'];
        //console.log(`User ID connecté: ${userId}`);
        
        clients.set(userId, socket);
        const pingInterval = setInterval(() => {
            if (socket.readyState === socket.OPEN) {
              socket.ping?.(); // méthode spécifique à Node.js WebSocket
            }
          }, 30000);
        //console.log(`Client ajouté à la Map. Nombre de clients connectés: ${clients.size}`);
        for (const [clientId, client] of clients.entries()) {
            if (clientId != userId && client.readyState === client.OPEN) {
                client.send(JSON.stringify({type : "new_connection", newUserId : userId}));
            }
        }
        
        socket.on('message', async (message) => {
            try {
                const data = JSON.parse(message.toString());
                // console.log('Message reçu:', data);
                // console.log("=== DÉBUT DISTRIBUTION MESSAGE ===");
                // console.log("Expéditeur:", data.userId);
                // console.log("Destinataire:", data.recipientId);
                // console.log("Contenu:", data.content);
                // console.log("Clients connectés:", Array.from(clients.keys()));
                // console.log("data Type :", data.type);
                
                if(data.type === 'hello'){
                    const response = await createNewMessageDb(1, data.userId, "Bonjour bienvenue parmi nous");
                    // console.log(response);
                    socket.send(JSON.stringify({
                        type: 'ack',
                        message: 'Message reçu avec succès',
                        originalData: data
                    }));
                }
                else if(data.type === 'send_message'){
                    
                    const recipientSocket = clients.get(data.recipientId.toString());
                    const response = await createNewMessageDb(data.userId, data.recipientId, data.content);
                    //console.log("Message sauvegardé pour plus tard:", response);
                    
                    if (recipientSocket && recipientSocket.readyState === 1) { // 1 = OPEN
                        //console.log("Timestamp from messaging routes:", new Date().toISOString());
                        recipientSocket.send(JSON.stringify({
                            type: 'new_message',
                            content: data.content,
                            senderId: data.userId,
                            recipientId: data.recipientId,
                            convId : response,
                            timestamp: new Date().toLocaleDateString([], { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' })
                        }));
                        
                        //console.log(`Message envoyé au destinataire ${data.recipientId}`);
                        
                        socket.send(JSON.stringify({
                            type: 'message_sent',
                            message: 'Message envoyé avec succès',
                            recipientId: data.recipientId
                        }));
                    } else {
                        //console.log(`Destinataire ${data.recipientId} non connecté ou socket fermée`);
                        
                        
                        // Informer l'expéditeur
                        socket.send(JSON.stringify({
                            type: 'message_saved',
                            message: 'Message sauvegardé, destinataire hors ligne',
                            recipientId: data.recipientId,
                            convId : response,
                            timestamp: new Date().toLocaleDateString([], { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' })
                        }));
                    }
                    //console.log("=== FIN DISTRIBUTION MESSAGE ===");
                }
            } catch (error) {
                console.error('Erreur de parsing JSON:', error);
                socket.send(JSON.stringify({
                    type: 'error',
                    message: 'Format de message invalide'
                }));
            }
        });
        
        socket.on('close', async (event: any) => {
            //console.log('WebSocket déconnecté:', event.code, event.reason);
            //console.log(`Client déconnecté (userId: ${userId})`);
            clearInterval(pingInterval);
            await updateUserLastSeen(parseInt(userId));
            await updateUserOnlineStatus(parseInt(userId));
            for (const [clientId, client] of clients.entries()) {
                if (clientId != userId && client.readyState === client.OPEN) {
                    client.send(JSON.stringify({type : "close_connection", newUserId : userId}));
                }
            }
            clients.delete(userId); 
            //console.log(`Client retiré de la Map. Nombre de clients connectés: ${clients.size}`);
        });
        
        socket.on('error', (error) => {
            //console.error(`Erreur WebSocket pour userId ${userId}:`, error);
            clients.delete(userId);
        });
    });

    fastify.get('/getConvAndMsg/:id', async (request : FastifyRequest, reply : FastifyReply) => {
        try{
            //console.log("TESTE DE PASSAGE");
            const userId = parseInt((request.params as UserIdParam['Params']).id);
            //console.log(userId);
            const convAndMsg = await getAllMsgAndConv(userId) as Conversation;
            reply.code(200).send({convAndMsg});
        }
        catch(err){
            reply.status(501).send({error : `${err} Internal Server Error`});
        }
    });
    fastify.post('/checkIfConversationExists/:id', async (request : FastifyRequest, reply : FastifyReply) => {
        try{
            const userId = parseInt((request.params as UserIdParam['Params']).id);
            const {friendId} = request.body as {friendId : string};
            //console.log("friendUsername is")
            //console.log(friendId);
            const friendresponse = await getUserByUsername(friendId);
            if(!friendresponse){
                reply.status(404).send({error : "User not found"});
                return;
            }
            if(friendresponse.id == userId){
                reply.code(200).send(-2);
                return;
            }
            const response = await checkIfConversationExists(userId, friendresponse.id);
            //console.log("check if conversation existe")
            //console.log(response);
            reply.code(200).send(response);
        }
        catch(err){
            reply.status(501).send({error : `${err} Internal Server Error`});
        }
    });
    fastify.post('/createConversation/:id', async (request : FastifyRequest, reply : FastifyReply) => {
        try{
            const userId = parseInt((request.params as UserIdParam['Params']).id);
            const {friendUsername} = request.body as {friendUsername : string};
            const friendId = await getUserByUsername(friendUsername);
            if(!friendId){
                reply.status(404).send({error : "User not found"});
                return;
            }
            const response = await createConversation(userId, friendId.id);
            //console.log(response);
            reply.code(200).send(response);
        }
        catch(err){
            //console.log(err);
            if ((err as string).includes('bloqué')){
                return reply.status(403).send({success : false,
                                                error : 'User is blocked.',
                                                code : 'USER BLOCKED'
                });
            }
            if ((err as string).includes('existe déjà')){
                return reply.status(403).send({success : false,
                                                error : 'Already exist',
                                                code : 'ALREADY EXIST'
                });
            }
            reply.status(500).send({error : `${err} Internal Server Error`});
        }
    });

    fastify.post('/deleteConversation/:id', async (request : FastifyRequest, reply : FastifyReply) => {
        try{
            const convId = parseInt((request.params as UserIdParam['Params']).id);
            const response = await deleteConversation(convId);
            //console.log(response);
            reply.code(200).send(response);
        }
        catch(err){
            reply.status(500).send({error : `${err} Internal Server Error`});
        }
    });
    fastify.post('/isUserConnected/:id', async (request : FastifyRequest, reply : FastifyReply)=> {
        try{
            const userId = parseInt((request.params as UserIdParam['Params']).id);
            const User = await getUserById(userId);
            //console.log(User);
            reply.code(200).send({isConnected : User?.isOnline === 1});
        }
        catch (err){
            reply.status(500).send({error : `${err} Internal Server Error`});
        }
    });
    fastify.get('/getMessageFromConv/:id', async (request : FastifyRequest, reply : FastifyReply) => {
        try{
            const convId = parseInt((request.params as UserIdParam['Params']).id);
            const messages = await getallMsgFromConv(convId);
            reply.code(200).send(messages);
        }
        catch(err){
            reply.status(500).send({error : `${err} 150 Internal Server Error`});
        }
    })
}