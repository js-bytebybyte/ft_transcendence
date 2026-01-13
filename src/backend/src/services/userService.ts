import { error } from "node:console";
import {db} from "../database.js";
import bcrypt from "bcrypt";
import { errorMonitor } from "node:events";

//db.run => when you need to write/modify something in DB
//db.get => when you want to get a single line from DB
//db.all => when you want to get multiple line from DB

export interface User {
  id: number;
  username: string;
  email: string;
  avatar_url?: string;
  auth_provider: string;
  two_fa_is_active: number;
  created_at: Date;
  updated_at: Date;
  isOnline: number;
  lastSeen: Date;
}

export interface UserCreationData {
    username : string;
    password : string;
    email : string;
    avatar_url? : string;
    auth_provider? : string;
}
export interface updateUserData {
  username?: string;
  email?: string;
  avatar_url?: string;
  auth_provider?: string;
}
interface AuthProviderRow {
  auth_provider: string;
}

export async function createChatBot(userData: UserCreationData): Promise<number> {
  return new Promise((resolve, reject) => {
    const checkQuery = `SELECT id FROM users WHERE username = ? OR email = ?`;
    db.get(checkQuery, [userData.username, userData.email], (err: Error, row: any) => {
      if (err) {
        return reject(err);
      }

      if (row) {
        // L'utilisateur existe déjà, retourner son ID
        return resolve(row.id);
      }

      // Sinon, on le crée
      bcrypt.hash(userData.password, 10, (err, passwordHash: string) => {
        if (err) {
          return reject(err);
        }

        const insertQuery = `INSERT INTO users (username, email, password_hash, avatar_url, auth_provider)
                             VALUES (?, ?, ?, ?, ?)`;

        db.run(insertQuery, [userData.username, userData.email, passwordHash, userData.avatar_url || null, 'chatbot'], function (this: { lastID: number }, err: Error) {
          if (err) {
            return reject(err);
          }

          const userId = this.lastID;

          db.run(`INSERT INTO player_stats (user_id) VALUES (?)`, [userId], function (err: Error) {
            if (err) {
              return reject(err);
            }

            resolve(userId);
          });
        });
      });
    });
  });
}

export async function createUser(userData : UserCreationData) : Promise<number> {
    return new Promise((resolve, reject)=> {
      if(userData.auth_provider == 'local'){
        bcrypt.hash(userData.password, 10, (err, passwordHash : string) => {
            if (err) {
              return reject(err);
            }
      
            const query = `
              INSERT INTO users (username, email, password_hash, avatar_url)
              VALUES (?, ?, ?, ?)
            `;
      
            db.run(
              query,
              [userData.username, userData.email, passwordHash, userData.avatar_url || null],
              function (this: {lastID : number}, err : Error) {
                if (err) {
                  return reject(err);
                }
                db.run(
                  `INSERT INTO player_stats (user_id) VALUES (?)`,
                  [this.lastID],
                  (err : Error) =>{
                    if(err){
                      return reject(err);
                    } 
                    resolve(this.lastID);
                  }
                );
              }
            );
        });
      }
      else{
        const query = `
              INSERT INTO users (username, email, password_hash, avatar_url, auth_provider)
              VALUES (?, ?, ?, ?, ?)
        `;
        // console.log(userData.username);
        // console.log(userData.email);
        // console.log(userData.password);
        // console.log(userData.auth_provider);
        // console.log(userData.avatar_url);
        db.run(query, [userData.username, userData.email, userData.password, userData.avatar_url || null, userData.auth_provider],
          function (this: {lastID: number}, err : Error) {
            if(err){
              return (reject(err));
            }
            const userId = this.lastID;
            db.run(`INSERT INTO player_stats (user_id) VALUES (?)`,
              [userId],
              function (err: Error) {
                if(err){
                  return (reject(err));
                }
                resolve(userId);
              }
            )
          }
        )
      }
    });
};

export async function authenticateUser(email : string, password : string): Promise<User | null>{
  return new Promise((resolve, reject)=>{
    const query = `
      SELECT id, username, email, password_hash, avatar_url, two_fa_is_active
      FROM users
      WHERE email = ?`;

      db.get(query, [email], (err, row: any)=>{
        if(err){
          return reject(err);
        }
        if(!row){
          return resolve(null);
        }
        bcrypt.compare(password, row.password_hash, (err, match) =>{
          if (err){
            return reject(err);
          }
          if(!match){
            return resolve(null);
          }
          //remove password_hash from row
          const { password_hash, ...user } = row;
          resolve(user as User);
        });
      })
  })
}

export async function authenticateUsername(username : string, password : string): Promise<User | null>{
  return new Promise((resolve, reject)=>{
    const query = `
      SELECT id, username, email, password_hash, avatar_url, two_fa_is_active
      FROM users
      WHERE username = ?`;

      db.get(query, [username], (err, row: any)=>{
        if(err){
          return reject(err);
        }
        if(!row){
          return resolve(null);
        }
        bcrypt.compare(password, row.password_hash, (err, match: any) =>{
          if (err){
            return reject(err);
          }
          if(!match){
            return resolve(null);
          }
          //remove password_hash from row
          const { password_hash, ...user } = row;
          resolve(user as User);
        });
      })
  })
}

export async function getUserByEmail(email : string): Promise<User | null>{
  return new Promise((resolve, reject) =>{
    const query = `
    SELECT id, username, email, avatar_url, auth_provider
    FROM users
    WHERE email = ?`;

    db.get(query, [email], (err, row) =>{
      if(err){
        reject (err);
      }
      if(!row){
        return resolve(null);
      }
      resolve(row as User)
    })
  })
}

export async function getUserByUsername(username : string): Promise<User | null>{
  return new Promise((resolve, reject) =>{
    const query = `
    SELECT *
    FROM users
    WHERE username = ?`;

    db.get(query, [username], (err, row: any) =>{
      if(err){
        reject (err);
      }
      if(!row){
        return resolve(null);
      }
      const { password_hash, ...user } = row;
      resolve(user as User)
    })
  })
}

export async function getUserById(userId : number): Promise<User | null>{
  return new Promise((resolve, reject) =>{
      const query = `
          SELECT *
          FROM users
          WHERE id = ?
      `;

      db.get(query, [userId], (err, row: any) =>{
        if(err){
          return reject(err);
        }
        if(!row){
          return resolve(null);
        }
        const { password_hash, ...user } = row;
        resolve(user as User);
      });
  });
}

export function getUsernameById(userId: number): Promise<string | null> {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT username
      FROM users 
      WHERE id = ?
      `;
    db.get<{username: string}>(query, [userId], (error, row) => {
      if (error) 
        return reject(error);
      if (row ) 
        return resolve(row.username);
      resolve(null); // if user not found
    });
  });
}


export async function getPlayerStats(userId : number): Promise<any>{
  return new Promise((resolve, reject) => {
    const query = `
      SELECT * FROM player_stats
      WHERE user_id = ?
    `;

    db.get(query, [userId], (err, row) => {
      if (err) {
        return reject(err);
      }
      if(!row){
        return resolve({
          user_id: userId,
          games_played: 0,
          games_won: 0,
          games_lost: 0,
          tournaments_played: 0,
          tournaments_won: 0,
          total_points_scored: 0,
          total_points_conceded: 0,
          updated_at: new Date().toISOString()
        });
      }
      resolve(row);
    });
  });
}

export async function updateUser(userId: number, updateData: updateUserData): Promise<any> {
  return new Promise(async (resolve, reject) => {
    try {
      let authProvider;
      const row = await db.get("SELECT auth_provider FROM users WHERE id = ?", [userId]);
      if (row && typeof (row as any).auth_provider === "string") {
          authProvider = (row as any).auth_provider;
      }

      const updates: string[] = [];
      const values: any[] = [];

      if (updateData.username) {
        updates.push("username = ?");
        values.push(updateData.username);
      }
      if (updateData.avatar_url !== undefined) {
        updates.push("avatar_url = ?");
        values.push(updateData.avatar_url);
      }
      // n'ajoute email que si provider local
      if (updateData.email && authProvider === "local") {
        updates.push("email = ?");
        values.push(updateData.email);
      }

      updates.push("updated_at = CURRENT_TIMESTAMP");

      if (updates.length === 1) {
        return resolve(true);
      }

      values.push(userId);

      const sql = `
        UPDATE users
        SET ${updates.join(", ")}
        WHERE id = ?
      `;
      db.run(sql, values, function (err) {
        if (err) {
          return reject(err);
        }
        resolve(this.changes > 0);
      });
    } catch (err) {
      reject(err);
    }
  });
}
export async function setCliToken(username : string, cliToken : string): Promise<any>{
  return new Promise((resolve, reject)=> {
    try{
      const query = `UPDATE users SET twofa = ? WHERE username = ?`;

      db.run(query,  [cliToken, username], function(err){
        if(err){
          reject (err);
        }
        resolve(this.changes > 0);
      });
    }
    catch (err){
      reject (err);
    }
  })
}

export async function updatePassword(userId : number, actualPass : string, newPass : string) : Promise<any> {
  return new Promise((resolve, reject)=>{
    try{
      const query = `
        SELECT id, username, email, password_hash, avatar_url
        FROM users
        WHERE id = ?`;
      db.get(query, [userId], (err, row: any)=> {
        if(err){
          reject (err);
        }
        if(!row){
          resolve(null);
        }
        bcrypt.compare(actualPass, row.password_hash, (err, match) =>{
          if (err){
            return reject(err);
          }
          if(!match){
            return resolve(null);
          }
          bcrypt.hash(newPass, 10, (err, newhashedPassword)=>{
            if(err){
              reject(err)
            }
            const updatequery = `UPDATE users SET password_hash = ? where id = ?`;
            db.run(updatequery, [newhashedPassword, userId], function (err){
              if(err){
                reject(err);
              }
              resolve(this.changes > 0);
            });
          });
      });
    });
    } catch(err){
    reject(err);
  }
});
}

export async function get2FaOption(userId : number) : Promise<number> {
  return new Promise((resolve, reject)=>{
    try{
      const query = `SELECT two_fa_is_active FROM users where id = (?)`;

      db.get(query, [userId], (err, row: any)=>{
        if(err){
          reject(err);
        }
        if(!row){
          resolve(-1);
          return
        }
        resolve(row.two_fa_is_active);
      })
    }
    catch(err){
      reject(err);
    }
  })
}

export async function change2FaOption(userId : number, isActivated : boolean) {
  return new Promise((resolve, reject)=>{
    try{
      const newValue = isActivated ? 0 : 1;
      const query = `UPDATE users SET two_fa_is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;

      db.run(query, [newValue, userId], (err)=>{
        if(err){
          reject(err);
        }
        resolve({success : true})
      })
    }
    catch(err){
      reject(err);
    }
  })
  
}

export async function getAllUsers() : Promise<User[]> {
  return new Promise((resolve, reject)=>{
    try{
      const query = `SELECT id, username, email, auth_provider, 
                    two_fa_is_active, twofa, isOnline, 
                    lastSeen, avatar_url, created_at, updated_at 
                    FROM users`; //WHERE isOnline = 1;  

      db.all(query, (err, rows)=>{
        if(err){
          reject(err);
        }
        resolve(rows as User[]);
      })
    }
    catch(err){
      reject(err);
    }
  })
}

export async function updateUserOnlineStatus(userId : number) : Promise<any>{
  return new Promise((resolve, reject)=>{
    try{
      const query = `UPDATE users
                      SET isOnline = CASE isOnline WHEN 0 THEN 1 ELSE 0 END,
                      updated_at = CURRENT_TIMESTAMP,
                      lastSeen = CURRENT_TIMESTAMP
                      WHERE id = ?`;

      db.run(query, [userId], (err)=>{
        if(err){
          reject(err);
        }
        resolve({success : true});
      })
    }
    catch(err){
      reject(err);
    }
  })
}

export async function VerifyUserOnlineStatus(userId: number): Promise<any> {
  return new Promise((resolve, reject) => {
    try {
      const query = `UPDATE users
                     SET isOnline = CASE WHEN isOnline = 0 THEN 1 ELSE isOnline END
                     WHERE id = ?`;

      db.run(query, [userId], (err) => {
        if (err) {
          reject(err);
        } else {
          resolve({ success: true });
        }
      });
    } catch (err) {
      reject(err);
    }
  });
}
export async function VerifyUserOfflineStatus(userId: number): Promise<any> {
  return new Promise((resolve, reject) => {
    try {
      //console.log(userId);
      const query = `UPDATE users
                     SET isOnline = CASE WHEN isOnline = 1 THEN 0 ELSE isOnline END
                     WHERE id = ?`;

      db.run(query, [userId], function (err) {
        if (err) {
          reject(err);
        } else {
          if (this.changes === 0) {
            resolve({ success: false, message: "Aucune mise à jour effectuée. Peut-être que l'utilisateur n'existe pas ou est déjà offline." });
          } else {
            resolve({ success: true });
          }
        }
      });
    } catch (err) {
      reject(err);
    }
  });
}

export async function updateUserLastSeen(userId : number) : Promise<any> {
  return new Promise((resolve, reject)=> {
    try{
      const query = `UPDATE users SET lastseen = CURRENT_TIMESTAMP WHERE id = ?`;

      db.run(query, [userId], (err)=>{
        if(err){
          reject(err);
        }
        resolve({succes : true});
      })
    }
    catch(err){
      reject (err);
    }
  })
}

export async function getCliToken(username : string): Promise<any>{
  return new Promise((resolve, reject)=> {
    try{
      const query = `SELECT twofa FROM users WHERE username = ?`;
      db.get(query, [username], function(err, row: any){
        if(err){
          reject(err)
        }
        if(row){
          resolve(row.twofa);
        }
        resolve(null);
      });
    }
    catch(err){
      reject (err);
    }
  })
}


export async function getMatchHistory(userId: number): Promise<any[]> {
  return new Promise((resolve, reject) => {
    try {
      const query = `
        SELECT 
          CASE
            WHEN m.winner_id = ? THEN 'VICTORY'
            ELSE 'DEFEAT'
          END AS outcome,
          printf('%d-%d', 
            CASE WHEN m.player1_id = ? THEN m.player1_score ELSE m.player2_score END,
            CASE WHEN m.player1_id = ? THEN m.player2_score ELSE m.player1_score END
          ) AS score,
          CASE
            WHEN m.player1_id = ? THEN u2.username
            ELSE u1.username
          END AS opponent,
          CASE
            WHEN m.tournament_id IS NULL THEN 'PRACTICE'
            WHEN t.participant_count = 2 THEN 'DUEL'
            ELSE 'TOURNAMENT'
          END AS category,
          COALESCE(t.created_at, DATE('now')) AS date
        FROM matches m
        JOIN users u1 ON u1.id = m.player1_id
        JOIN users u2 ON u2.id = m.player2_id
        LEFT JOIN tournaments t ON t.id = m.tournament_id
        WHERE (m.player1_id = ? OR m.player2_id = ?)
          AND m.match_status = 'played'
        ORDER BY t.created_at DESC, m.id DESC
        LIMIT 10
      `;

      db.all(
        query,
        [userId, userId, userId, userId, userId, userId],
        (err, rows) => {
          if (err) {
            reject(err);
          } else {
            const today = new Date();
            const formatted = rows.map((row: any) => {
              const matchDate = new Date(row.date);
              const diffDays = Math.floor((today.getTime() - matchDate.getTime()) / (1000 * 60 * 60 * 24));
              row.date =
                diffDays === 0
                  ? 'TODAY'
                  : diffDays === 1
                  ? 'YESTERDAY'
                  : row.date.split('T')[0]; // YYYY-MM-DD fallback
              return row;
            });

            resolve(formatted);
          }
        }
      );
    } catch (err) {
      reject(err);
    }
  });
}
