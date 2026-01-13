import { authService } from "./auth.js";
import { createMessageElement } from "../pages/renderChatBox.js";
import { userApi } from "./api.js";
import { router } from "../router.js";

export class MessagingService {
    private socket : WebSocket | null = null;
    constructor(){
        this.socket = null;
    }
    setWebSocket(socket : WebSocket){
        this.socket = socket;
    }
    async getWebSocket(): Promise<WebSocket | null>{
        if(!this.socket || this.socket.readyState === WebSocket.CLOSED || this.socket.readyState === WebSocket.CLOSING){
            try {
                this.socket = await connectWebSocket();
            } catch (error) {
                //console.log("Erreur lors de la connexion WebSocket:", error);
                return null;
            }
        }
        return this.socket;
    }
    async sendMessage(recipientId: string, content: string): Promise<void> {
        const socket = await this.getWebSocket();
        const userId = await authService.getUserId();
        
        if (socket && socket.readyState === WebSocket.OPEN && userId) {
            socket.send(JSON.stringify({
                type: 'send_message',
                userId: userId,
                recipientId: recipientId,
                content: content
            }));
        } else {
            //console.log("WebSocket non disponible pour envoyer le message");
        }
    }
}
export async function connectWebSocket(): Promise<WebSocket>{
    return new Promise(async (resolve, reject) => {
        const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const userId = await authService.getUserId();
        
        if (!userId) {
            reject("Utilisateur non connecté");
            return;
        }
        
        const wsUrl = `${wsProtocol}//localhost:3000/api/ws/chat?userId=${userId}`;
        //console.log("Tentative de connexion WebSocket:", wsUrl);
        
        const socket = new WebSocket(wsUrl);
        
        socket.onopen = () => {
            //console.log("WebSocket connecté avec succès");
            resolve(socket);
        };
        
        socket.onmessage = async(event) => {
            const currentPath = window.location.pathname;
            //console.log(`currentPath = ${currentPath}`);
            
            const isInChatbox = currentPath.includes('/chat') || document.getElementById('messages') !== null;
            //console.log(`isInChatBox = ${isInChatbox}`);
            
            try {
                const data = JSON.parse(event.data);
                //console.log("Message reçu:", data);
                const notif = document.getElementById("chatbox-link");
                //console.log(`test de l'id de la conversation ${data.convId}`);
                //console.log(`id = conversation-${data.convId}`);
                // Gérer différents types de messages
                switch(data.type) {
                    case 'close_connection':
                        if(isInChatbox){
                            const onlineStatus = document.getElementById(`OnlineStatus-${data.newUserId}`);
                            if(onlineStatus){
                                onlineStatus.textContent = 'Hors ligne';
                                onlineStatus.classList.remove("online");
                                onlineStatus.classList.add("offline");
                            }
                        }
                        break;
                    case 'new_connection':
                        if(isInChatbox){
                            const onlineStatus = document.getElementById(`OnlineStatus-${data.newUserId}`);
                            if(onlineStatus){
                                onlineStatus.textContent = 'Connecté';
                                onlineStatus.classList.remove("offline");
                                onlineStatus.classList.add("online");
                            }
                        }
                        break;
                    case 'new_message':
                        if(isInChatbox){
                            const activeConv = document.getElementById(`conversation-${data.convId}`);
                            if(!activeConv){
                                router.navigate('/chat');
                                return;
                            }
                            const isActive = activeConv.getAttribute("active");
                            //console.log(`isActive = ${isActive}`);
                            if(isActive === "true"){
                                const User = await userApi.getUserById(data.senderId);
                                const newMessage = createMessageElement(data.content, false, User.user.avatar_url);
                                //console.log(`newMessageElement =`, newMessage);
                                const messagesContainer = document.getElementById("messages");
                                //console.log(`messagesContainer =`, messagesContainer);
                                if(messagesContainer){
                                    //console.log("Récupération du container de message réussi");
                                    messagesContainer.appendChild(newMessage);
                                    messagesContainer.scrollTop = messagesContainer.scrollHeight;
                                }
                            }
                            else if(isInChatbox && isActive === "false"){
                                //console.log("Tentative d'ajout de notif à la conversation DIV");
                               //console.log("État des classes avant:", activeConv.className);
                                activeConv.classList.add("notif");
                                //console.log("État des classes après:", activeConv.className);
                                
                                // Vérifier si la classe a bien été ajoutée
                                if (activeConv.classList.contains("notif")) {
                                    //console.log("La classe 'notif' a été ajoutée avec succès");
                                } else {
                                    //console.log("ERREUR: La classe 'notif' n'a pas été ajoutée");
                                    // Forcer l'ajout de la classe avec setAttribute
                                    const currentClasses = activeConv.className;
                                    activeConv.className = `${currentClasses} notif`;
                                    //console.log("Classes après forçage:", activeConv.className);
                                }
                            }
                        }           
                        else if(!isInChatbox){
                            notif?.classList.add("notif");
                        }
                        break;
                        
                    case 'message_sent':
                        //console.log("Message envoyé avec succès:", data.message);
                        break;
                        
                    case 'message_saved':
                        //console.log("Message sauvegardé:", data.message);
                        break;
                        
                    case 'ack':
                        //console.log("Accusé de réception:", data.message);
                        break;
                        
                    case 'error':
                        //console.error("Erreur du serveur:", data.message);
                        break;
                        
                    default:
                        console.log("Type de message non géré:", data.type);
                }
            } catch (error) {
                //console.error("Erreur de parsing du message reçu:", error);
            }
        };
        
        socket.onclose = async(event) => {
            //console.log('WebSocket déconnecté:', event.code, event.reason);
            await userApi.updateUserLastSeen(userId);
        };
        
        socket.onerror = (error) => {
            //console.error('Erreur WebSocket:', error);
            reject(error);
        };
        
        // // Délai d'attente pour la connexion
        // setTimeout(() => {
        //     if (socket.readyState !== WebSocket.OPEN) {
        //         socket.close();
        //         reject(new Error("Délai d'attente de connexion WebSocket dépassé"));
        //     }
        // }, 5000);
    });
}

export const messagingService = new MessagingService();