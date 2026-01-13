import { db } from "../database.js";
import { getUserById, getUserByUsername, getAllUsers, updateUserOnlineStatus } from "../services/userService.js";

interface User{
    id : number,
    username : string,
    isOnline : number,
    lastSeen : Date,
}
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
interface WebSocketConnection {
    socket: WebSocket;
    userId: string;
}
export async function checkIfConversationExists(userId1: number, userId2: number): Promise<number | null | -1> {
  return new Promise((resolve, reject) => {
    db.get(
      `SELECT 1 FROM friendships
       WHERE (
         (user_id = ? AND friend_id = ?)
         OR
         (user_id = ? AND friend_id = ?)
       )
       AND status = 'blocked'
       LIMIT 1`,
      [userId1, userId2, userId2, userId1],
      (err, blockRow) => {
        if (err) {
          return reject(err);
        }
        if (blockRow) {
          return resolve(-1);
        }

        db.get(
          `SELECT id FROM conversations 
           WHERE (user1_id = ? AND user2_id = ?) 
              OR (user1_id = ? AND user2_id = ?)
           LIMIT 1`,
          [userId1, userId2, userId2, userId1],
          (err, row: any) => {
            if (err) {
              return reject(err);
            }
            resolve(row ? row.id : null);
          }
        );
      }
    );
  });
}
export async function createNewMessageDb(sender_id: number, receiver_id: number, content: string): Promise<number> {
  return new Promise((resolve, reject) => {
      const [user1_id, user2_id] = sender_id < receiver_id
          ? [sender_id, receiver_id]
          : [receiver_id, sender_id];

      // Vérification du statut 'blocked' dans la table friendships
      const checkBlockedQuery = `
          SELECT 1 FROM friendships
          WHERE 
              (user_id = ? AND friend_id = ? AND status = 'blocked') OR
              (user_id = ? AND friend_id = ? AND status = 'blocked')
      `;

      db.get(checkBlockedQuery, [sender_id, receiver_id, receiver_id, sender_id], (err, blockedRow) => {
          if (err) {
              return reject(err);
          }

          if (blockedRow) {
              return reject(new Error("Impossible d’envoyer un message. Un des utilisateurs a bloqué l’autre."));
          }

          // Vérifie si la conversation existe déjà
          db.get(
              `SELECT id FROM conversations WHERE user1_id = ? AND user2_id = ?`,
              [user1_id, user2_id],
              (err, row: any) => {
                  if (err) {
                      return reject(err);
                  }

                  if (row) {
                      // Conversation existe déjà
                      const conversationId = row.id;
                      const messageQuery = `INSERT INTO chat_messages (conversation_id, sender_id, receiver_id, content)
                                             VALUES (?, ?, ?, ?)`;
                      db.run(messageQuery, [conversationId, sender_id, receiver_id, content], function (err) {
                          if (err) {
                              return reject(err);
                          }
                          resolve(conversationId);
                      });
                  } else {
                      // Crée une nouvelle conversation
                      db.run(`INSERT INTO conversations (user1_id, user2_id) VALUES (?, ?)`, [user1_id, user2_id], function (err) {
                          if (err) {
                              return reject(err);
                          }

                          const newConversationId = this.lastID;

                          const messageQuery = `INSERT INTO chat_messages (conversation_id, sender_id, receiver_id, content)
                                                VALUES (?, ?, ?, ?)`;
                          db.run(messageQuery, [newConversationId, sender_id, receiver_id, content], function (err) {
                              if (err) {
                                  return reject(err);
                              }
                              resolve(newConversationId);
                          });
                      });
                  }
              }
          );
      });
  });
}


export async function getAllMsgAndConv(userId: number): Promise<any> {
    return new Promise((resolve, reject) => {
      const query = `
      SELECT 
        c.id AS conversation_id,
        c.user1_id,
        c.user2_id,
        c.created_at AS conversation_created_at,
        m.id AS message_id,
        m.sender_id,
        m.receiver_id,
        m.content,
        m.read,
        m.created_at AS message_created_at
      FROM 
        conversations c
      LEFT JOIN 
        chat_messages m ON m.conversation_id = c.id
      LEFT JOIN 
        friendships f1 ON f1.user_id = c.user1_id AND f1.friend_id = c.user2_id AND f1.status = 'blocked'
      LEFT JOIN 
        friendships f2 ON f2.user_id = c.user2_id AND f2.friend_id = c.user1_id AND f2.status = 'blocked'
      WHERE 
        (c.user1_id = ? OR c.user2_id = ?)
        AND f1.id IS NULL
        AND f2.id IS NULL
      ORDER BY 
        c.created_at ASC, m.created_at ASC
    `;
  
      db.all(query, [userId, userId], (err, rows) => {
        if (err) {
          return reject(err);
        }
  
        // Regrouper les messages par conversation
        const conversationsMap: { [key: number]: any } = {};
        //console.log(rows);
        rows.forEach((row : any) => {
          if (!conversationsMap[row.conversation_id]) {
            conversationsMap[row.conversation_id] = {
              conversation_id: row.conversation_id,
              user1_id: row.user1_id,
              user2_id: row.user2_id,
              created_at: row.conversation_created_at,
              messages: [],
            };
          }
  
          if (row.message_id) {
            conversationsMap[row.conversation_id].messages.push({
              message_id: row.message_id,
              sender_id: row.sender_id,
              receiver_id: row.receiver_id,
              content: row.content,
              read: row.read,
              created_at: row.message_created_at,
            });
          }
        });
  
        const conversations = Object.values(conversationsMap);
        resolve(conversations);
      });
    });
}

export async function getallMsgFromConv(ConvId : number){
  return new Promise((resolve, reject) => {
    const query = `SELECT 
    cm.id,
    cm.conversation_id,
    cm.sender_id,
    cm.receiver_id,
    cm.content,
    cm.read,
    cm.created_at,
    u_sender.username as sender_username,
    u_receiver.username as receiver_username
    FROM chat_messages cm
    LEFT JOIN users u_sender ON cm.sender_id = u_sender.id
    LEFT JOIN users u_receiver ON cm.receiver_id = u_receiver.id
    WHERE cm.conversation_id = ? 
    ORDER BY cm.created_at ASC`;
    db.all(query, [ConvId], (err, rows) => {
      if(err){
        return reject(err);
      }
      resolve(rows);
    })
  })
}

export async function createConversation(userId: number, friendId: number) {
  return new Promise((resolve, reject) => {
    const [user1_id, user2_id] =
      userId < friendId ? [userId, friendId] : [friendId, userId];

    // Vérifie si l'un des deux utilisateurs a bloqué l'autre
    const checkBlockedQuery = `
      SELECT 1 FROM friendships
      WHERE 
        (user_id = ? AND friend_id = ? AND status = 'blocked') OR
        (user_id = ? AND friend_id = ? AND status = 'blocked')
    `;

    db.get(checkBlockedQuery, [userId, friendId, friendId, userId], (err, blockedRow) => {
      if (err) {
        return reject(err);
      }

      if (blockedRow) {
        return reject("Impossible de créer la conversation : l'un des utilisateurs a bloqué l'autre.");
      }

      // Vérifie si la conversation existe déjà
      db.get(
        `SELECT id FROM conversations WHERE user1_id = ? AND user2_id = ?`,
        [user1_id, user2_id],
        (err, row) => {
          if (err) {
            return reject(err);
          }

          if (row) {
            return reject(new Error("La conversation existe déjà."));
          }

          // Crée la nouvelle conversation
          db.run(
            `INSERT INTO conversations (user1_id, user2_id) VALUES (?, ?)`,
            [user1_id, user2_id],
            function (err) {
              if (err) {
                return reject(err);
              }
              resolve(this.lastID); // ID de la nouvelle conversation
            }
          );
        }
      );
    });
  });
}

export async function deleteConversation(convId : number){
  return new Promise((resolve, reject)=> {
    const query = `DELETE FROM conversations
    WHERE id = ?`
    db.run(query, [convId], (err)=> {
      if(err){
        return reject(err);
      }
      //console.log("conversation deleted");
      resolve(true);
    })
  })
}
    
