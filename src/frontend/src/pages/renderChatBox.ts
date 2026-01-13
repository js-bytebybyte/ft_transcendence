import { userApi } from "../API/api.js";
import { authService } from "../API/auth.js";
import { router } from "../router.js";
import { messagingService } from "../API/mysocket.js";
import { renderProfilPage } from "./renderProfilPage.js";
import { escapeHtml } from "../utils.js"
import { setNavbarError } from "../utils.js";
let currentRecipientId: string | null = null;

export interface Message {
    message_id: number;
    sender_id: number;
    receiver_id: number;
    content: string;
    read: boolean;
    created_at: string; // ISO date string
}
export interface Conversation {
    conversation_id: number;
    user1_id: number;
    user2_id: number;
    created_at: string; // ISO date string
    messages: Message[];
}
let userId : string | null = null;
export async function renderChatBox(mainElement : HTMLElement){
    const logged = await authService.isValid();
    if (!logged){
        router.navigate('/home');
        return;
    }
    const status = document.getElementById("status");
    if(status){
      status.innerHTML = "Chat Box";
    }
    const ChatNavelement = document.getElementById("chatbox-link");
    if(ChatNavelement && ChatNavelement.classList.contains("notif")){
        ChatNavelement.classList.remove("notif");
    }
    mainElement.innerHTML = `
        <div class="chatlayout">
            <div class="openConv bg-opacity-90">
                <div class="p-4">
                    <h2 class="text-xs font-medium text-gray-400 uppercase tracking-wider">
                        CONVERSATIONS
                    </h2>
                </div>
                <div class="conversations-list">
                    <div id="conversationsList" class="p-2 space-y-1">
                    </div>
                    <button id="newConversationButton" class="newConversationButton">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path>
                        </svg>
                    </button>
                </div>
            </div>
            <div class="chat-container">
                <div id="messages" class="chatbox"></div>
                <div class="message-input-container">
                    <input type="text" id="messageInput" placeholder="Tapez votre message" class="message-input" />
                    <button id="sendButton" class="sendMsgButton">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path>
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    </div>  `;
    
    userId = await authService.getUserId();
    if(!userId){
        alert("You are not logged in");
        return;
    }
    //console.log(userId);
    try {
            const response = await userApi.getConvAndMsg(userId);
            //console.log(response);
            
            if (response && response.convAndMsg && response.convAndMsg.length > 0) {
                displayConversations(response.convAndMsg, userId);
            } else {
                const messagesContainer = document.getElementById("messages");
                if (messagesContainer) {
                    messagesContainer.innerHTML = '<p class="text-center text-gray-500 mt-4">Aucune conversation trouvée</p>';
                }
            }
        } catch (error) {
            //console.error("Erreur lors de la récupération des messages:", error);
            const messagesContainer = document.getElementById("messages");
            if (messagesContainer) {
                messagesContainer.innerHTML = '<p class="text-center text-red-500 mt-4">Erreur lors du chargement des conversations</p>';
            }
        }
    
    const newConversationButton = document.getElementById("newConversationButton");
    const sendButton = document.getElementById("sendButton");
    const messageInput = document.getElementById("messageInput") as HTMLInputElement;
    const messages = document.getElementById("messages");

    if(newConversationButton){
        newConversationButton.addEventListener("click", () => {
            handleNewConversation(userId, null);
        });
    }
    
    if(sendButton && messageInput){
        sendButton.addEventListener("click", () => {
            const escapeMsg = escapeHtml(messageInput.value);
            sendMessage(escapeMsg);
        });
        
        messageInput.addEventListener("keypress", (e) => {
            if (e.key === "Enter") {
                const escapeMsg = escapeHtml(messageInput.value);
                sendMessage(escapeMsg);
            }
        });
    }
}

function displayConversations(conversations: any[], currentUserId: string) {
    const conversationsList = document.getElementById("conversationsList");
    const messagesContainer = document.getElementById("messages");
    
    if (!conversationsList || !messagesContainer) return;
    
    // Vider les conteneurs
    conversationsList.innerHTML = '';
    
    // Afficher la liste des conversations
    conversations.forEach(async (conv, index) => {
        const user1IdStr = String(conv.user1_id);
        const user2IdStr = String(conv.user2_id);
        const currentUserIdStr = String(currentUserId);
        //console.log(conv);
        //console.log(`Types - user1_id: ${typeof conv.user1_id}, user2_id: ${typeof conv.user2_id}, currentUserId: ${typeof currentUserId}`);
        //console.log(`Valeurs - user1_id: ${user1IdStr}, user2_id: ${user2IdStr}, currentUserId: ${currentUserIdStr}`);
        
        let otherUserId;
        let userId;
        if (user1IdStr === currentUserIdStr) {
            otherUserId = conv.user2_id;
            //console.log("Condition vraie: otherUserId = user2_id");
            userId = conv.user1_id;
        } else {
            otherUserId = conv.user1_id;
            //console.log("Condition fausse: otherUserId = user1_id");
            userId = conv.user2_id;
        }
        
        //console.log(`OTHER USER ID : ${otherUserId}`)
        const otherUser = await userApi.getUserById(otherUserId);
        //console.log(otherUser);
        const convElement = document.createElement("div");
        if(index === 0){
            convElement.setAttribute("active", "true");
        }else{
            convElement.setAttribute("active", "false");
        }
        //console.log(`conversation-${conv.conversation_id}`);
        //console.log(otherUser.user.isOnline);
        let UserLastSeen;
        if(otherUser.user.isOnline === 1){
            convElement.classList.add("online");
            UserLastSeen = "Connecté";
        }else{
            convElement.classList.add("offline");
            UserLastSeen = formatLastSeenTime(otherUser.user.lastSeen);
        }   
        //console.log(UserLastSeen);
        const ProfilUrl = otherUser.user.avatar_url;
        convElement.id = `conversation-${conv.conversation_id}`;
        convElement.className = "conversation-item flex items-center gap-3 p-2 relative";
        convElement.innerHTML = `
            <div class="dropdown">
                <a id="AvatarDropDown-${otherUser.user.id}" href="#" class="shrink-0">
                    <img src="${ProfilUrl}" alt="Photo de profil" class="w-10 h-10 rounded-full object-cover">
                </a>
                <div id="dropdownMenu_${otherUser.user.id}" class="dropdown-menu">
                    <a href="#" id="optionOne_${otherUser.user.id}">Remove Friend</a>
                    <a href="#" id="optionTwo_${otherUser.user.id}">View Profile</a>
                    <a href="#" id="optionThree_${otherUser.user.id}">Block User</a>
                    <a href="#" id="optionFour_${otherUser.user.id}">Invite on Pong Tournament</a>
                </div>
            </div>
            <div class="flex items-center space-x-3 flex-1">
                <div class="font-mono text-white">${otherUser.user.username}</div>
                <div id="OnlineStatus-${otherUser.user.id}" class="text-sm text-gray-500">${UserLastSeen}</div>
            </div>
            <div class="delete-conversation absolute top-2 right-2 text-gray-400 hover:text-red-500 cursor-pointer">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/>
                </svg>
            </div>
        `;
        const dropdownMenu = convElement.querySelector(`#dropdownMenu_${otherUser.user.id}`) as HTMLElement;
        const dropdownButton = convElement.querySelector(`#AvatarDropDown-${otherUser.user.id}`) as HTMLElement



        dropdownButton?.addEventListener("click", (e)=>{
            e.stopPropagation(); // Empêche la propagation de l'événement
            dropdownMenu?.classList.toggle("visible");
          });
          
        document.addEventListener("click", (event)=>{
            if (!dropdownButton?.contains(event.target as Node) && !dropdownMenu?.contains(event.target as Node)) {
                dropdownMenu?.classList.remove("visible");
              }
        });
        convElement.addEventListener("click", async (e) => {
            if ((e.target as Element).closest('.delete-conversation')) {
                return;
            }
            //console.log(`currentConvId = ${conv.conversation_id}`);
            const notifElement = document.getElementById(`conversation-${conv.conversation_id}`);
            if(notifElement && notifElement.classList.contains("notif")){
                notifElement.classList.remove("notif");
            }
            currentRecipientId = otherUser.user.id.toString();
            //console.log(`PAR PITIER ${currentRecipientId}`);
            const convMsg = await userApi.getMessageFromConv(conv.conversation_id.toString());
            displayMessages(convMsg as unknown as Message[], currentUserId, messagesContainer, conv.conversation_id.toString(), ProfilUrl);
        
            document.querySelectorAll(".conversation-item").forEach(item => {
                item.setAttribute("active", "false");
                item.classList.remove("bg-gray-400");
            });
        
            convElement.setAttribute("active", "true");
            convElement.classList.add("bg-gray-400");
        });
        const OptionOne = convElement.querySelector(`#optionOne_${otherUser.user.id}`);
        OptionOne?.addEventListener("click", async(e) => {
            e.preventDefault(); 
            e.stopPropagation();
            const confirm = window.confirm("Are you sure you want to delete this friend ?");
            
                if (confirm) {
                  const mainElement = document.getElementById("app-container");
                  const response = await userApi.removeFriend(userId, otherUser.user.id.toString());
                  //console.log(response);
                  if(mainElement){
                    router.navigate('/chat');}
            
                } else {
                  //console.log("ON retourne");
                }
        });
        const OptionTwo = convElement.querySelector(`#optionTwo_${otherUser.user.id}`);
        OptionTwo?.addEventListener("click", async(e) => {
            e.preventDefault(); 
            e.stopPropagation();
            const mainElement = document.getElementById("app-container");
            if(!mainElement){
                alert("mainElement not found in optionTwo ConvElement callback");
                return;
            }
            router.setOldPath();
            router.navigate(`/profil/${otherUser.user.id}`);
        });
        const OptionThree = convElement.querySelector(`#optionThree_${otherUser.user.id}`);
        OptionThree?.addEventListener("click", async(e) => {
            e.preventDefault(); 
            e.stopPropagation();
            const confirm = window.confirm("Are you sure you want to block this User ? This will also delete the conversation");

            if(confirm){
              const mainElement = document.getElementById("app-container");
              const response = await userApi.blockUser(userId, otherUser.user.id);
              if(response){
                const status = document.getElementById("status");
                if(status){
                    status.innerHTML = `User has been blocked`;
                }
              }
              await userApi.deleteConversation(conv.conversation_id.toString());
              //console.log(response);
              if(mainElement){
                router.navigate('/chat');
              }
            }
        });

        const OptionFour = convElement.querySelector(`#optionFour_${otherUser.user.id}`);
        OptionFour?.addEventListener("click", async(e)=>{
            e.preventDefault();
            e.stopPropagation();
            let currentTournament = await userApi.getOrCreateCurrentTournament("regular");
            const tournamentId = currentTournament.id;

            const response = await userApi.addTournamentPlayer(otherUser.user.id, otherUser.user.username, tournamentId);
            if(response){
                if(currentUserId != otherUser.user.id.toString()){
                    await sendMessage("Hey i just invited you to play a pong game come on my computer", otherUser.user.id.toString());
                }
            }
            else{
                setNavbarError("Error while adding player in actual tournament from chatBox");
            }

        })

        
        const deleteButton = convElement.querySelector('.delete-conversation');
        if (deleteButton) {
            deleteButton.addEventListener('click', async (e) => {
                e.preventDefault();
                e.stopPropagation(); 
                //console.log(`Delete conversation ${conv.conversation_id}`);
                await userApi.deleteConversation(conv.conversation_id.toString());
                //console.log(currentRecipientId);
                //console.log(otherUser.user.id);
                if(currentRecipientId == otherUser.user.id){
                    const VisibleMessage = document.getElementById('messages');
                    if(VisibleMessage){
                        VisibleMessage.innerHTML = ``;
                    }
                }
                currentRecipientId = null;
                convElement.remove();
            });
        }
        
        conversationsList.appendChild(convElement);
        
        // Afficher automatiquement la première conversation
        if (index === 0) {
            currentRecipientId = otherUser.user.id.toString();
            displayMessages(conv.messages, currentUserId, messagesContainer, conv.conversation_id.toString(), ProfilUrl);
            convElement.classList.add("bg-gray-400");
        }
    });
}

function displayMessages(messages: any[], currentUserId: string, container: HTMLElement, currentConvId : string, ProfilUrl : string) {
    container.innerHTML = '';
    //console.log(`currentConvId = ${currentConvId}`);
    //console.log(messages);
    
    if (messages.length === 0) {
        container.innerHTML = '<p class="text-center text-gray-500 mt-4">Aucun message dans cette conversation</p>';
        return;
    }

    const messagesWrapper = document.createElement("div");
    messagesWrapper.className = "messages-wrapper p-4 space-y-4";
    //console.log("displayMessages");
    //console.log(`longueur des messages recus : ${messages.length}`);

    messages.forEach(msg => {
        const senderId = String(msg.sender_id).trim();
        const currentId = String(currentUserId).trim();
        const isCurrentUser = senderId === currentId;

        const messageElement = document.createElement("div");
        messageElement.className = `message ${isCurrentUser ? 'sent' : 'received'} flex items-end space-x-2 ${
            isCurrentUser ? 'justify-end' : 'justify-start'
        }`;
        

        // Crée le contenu du message
        const messageContent = document.createElement("div");
        messageContent.className = `message-content p-3 rounded-lg max-w-xs ${
            isCurrentUser ? 'text-white' : 'bg-gray-200 text-black'
        }`;

        const utcFormatted = msg.created_at.replace(' ', 'T') + 'Z';
        const LocalTime = new Date(utcFormatted).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', timeZone: 'Europe/Paris'});

        messageContent.innerHTML = `
            <div class="message-text font-mono">${msg.content}</div>
            <div class="message-time text-xs ${isCurrentUser ? 'text-blue-100' : 'text-gray-500'} text-right">
                ${LocalTime}
            </div>
        `;

        // Si ce n’est pas le current user, on ajoute la photo de profil
        if (!isCurrentUser) {
            const avatar = document.createElement("img");
            avatar.src = ProfilUrl;
            avatar.alt = "Profil";
            avatar.className = "w-8 h-8 rounded-full object-cover"; // taille et forme de l'image

            messageElement.appendChild(avatar); // photo à gauche
            messageElement.appendChild(messageContent); // message à droite
        } else {
            messageElement.appendChild(messageContent); // message seul (aligné à droite)
        }

        messagesWrapper.appendChild(messageElement);
    });

    container.appendChild(messagesWrapper);
    container.scrollTop = container.scrollHeight;
}

export async function sendMessage(content: string, receiver_id?: string) {
    if (!content.trim()) return;
    //console.log(currentRecipientId);
    //console.log("Message à envoyer:", content);
    if(!userId){
        userId = await authService.getUserId();
    }
    if(receiver_id){
        currentRecipientId = receiver_id;
    }
    if(currentRecipientId){
        const socket = await messagingService.getWebSocket();
        if(!socket){
            alert("Relog pls");
            return;
        }
        socket.send(JSON.stringify({ type: "send_message",userId : userId, content, recipientId: currentRecipientId }));
        const newMessage = createMessageElement(content, true);
        const messagesContainer = document.getElementById("messages");
        if(messagesContainer){
            messagesContainer.appendChild(newMessage);
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
    }
    // Vider l'input après envoi
    const messageInput = document.getElementById("messageInput") as HTMLInputElement;
    if (messageInput) {
        messageInput.value = "";
    }
}

export async function handleNewConversation(userId : string, friendName : string | null){
    const status = document.getElementById("status");
    if(!friendName){
        friendName = prompt("Enter name of the user to start a chat with");
    }
    if(friendName){
      try{
        const checkResponse = await userApi.checkIfConversationExists(userId, friendName);
        //console.log("oui c ést moi ");
        //console.log(checkResponse);
        if(checkResponse){
            //console.log("checkResponse is not null");
            if(checkResponse == -1){
                if(status){
                    status.innerHTML =  'USER IS BLOCKED';
                    status.classList.remove("text-black");
                    status.classList.add("text-red-500");
                }
                return;
            }
            else if(checkResponse > -1){
                if(status){
                    status.innerHTML = "Conversation already exists";
                }
                router.navigate('/chat');
                return;
            }
            else if(checkResponse == -2){
                if(status){
                    status.innerHTML = "You can't chat with yourself";
                }
                return;
            }
        }
        //console.log("apres oui c'est moi")
        const response = await userApi.createConversation(userId, friendName);
        //console.log(response);
        const mainElement = document.getElementById("app-container");
        if(!mainElement){
            return;
        }
        router.navigate('/chat');
        //console.log(response);
      }
      catch (err) {

            if (err.message == "User not found") {
                    const status = document.getElementById("status");
                        if (status) {
                            status.innerHTML = 'USER NOT FOUND';
                            status.classList.remove("text-black");
                            status.classList.add("text-red-500");
                        }
                    return;
                }
                alert(err);
                //console.log(err);
    }
    }
}

export function createMessageElement(content: string, isCurrentUser: boolean, profileUrl?: string): HTMLElement {
    const messageElement = document.createElement("div");
    messageElement.className = `message ${isCurrentUser ? 'sent' : 'received'} flex items-end space-x-2 ${
        isCurrentUser ? 'justify-end' : 'justify-start'
    }`;
    
    const messageContent = document.createElement("div");
    messageContent.className = `message-content p-3 rounded-lg max-w-xs ${
        isCurrentUser ? 'text-white' : 'bg-gray-200 text-black'
    }`;

    messageContent.innerHTML = `
        <div class="message-text font-mono">${content}</div>
        <div class="message-time text-xs ${isCurrentUser ? 'text-blue-100' : 'text-gray-500'} text-right">
            ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' })}
        </div>
    `;

    // Si ce n'est pas le current user, on ajoute la photo de profil
    if (!isCurrentUser && profileUrl) {
        const avatarImg = document.createElement("img");
        avatarImg.src = profileUrl;
        avatarImg.alt = "Photo de profil";
        avatarImg.className = "w-8 h-8 rounded-full object-cover";
        
        messageElement.appendChild(avatarImg); // photo à gauche
        messageElement.appendChild(messageContent); // message à droite
    } else {
        messageElement.appendChild(messageContent); // message seul (aligné à droite)
    }

    return messageElement;
}

function formatLastSeenTime(lastSeen: string): string {
    const now = new Date();
    const lastSeenDate = new Date(lastSeen.replace(' ', 'T') + 'Z'); // UTC

    const diffMs = now.getTime() - lastSeenDate.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);
    const diffWeeks = Math.floor(diffDays / 7);

    if (diffMinutes < 1) {
        return `en ligne à l’instant`;
    } else if (diffMinutes < 60) {
        return `connecté il y a ${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''}`;
    } else if (diffHours < 24) {
        return `connecté il y a ${diffHours} heure${diffHours !== 1 ? 's' : ''}`;
    } else if (diffDays < 7) {
        return `connecté il y a ${diffDays} jour${diffDays !== 1 ? 's' : ''}`;
    } else {
        return `connecté il y a ${diffWeeks} semaine${diffWeeks !== 1 ? 's' : ''}`;
    }
}
