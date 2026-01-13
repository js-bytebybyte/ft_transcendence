import {db} from "../database.js";

export async function sendFriendRequest(userId : number, friendId : number) : Promise<number> {
    return new Promise((resolve, reject) => {
        if(userId === friendId){
            reject("You can't send a friend request to yourself");
        }
        const verifquery = `SELECT * FROM friendships
                        WHERE (user_id = ? AND friend_id = ?)
                        OR (user_id = ? AND friend_id = ?)`;
        
        db.get(verifquery, [userId, friendId, friendId, userId], (err, row: any) => {
            if(err){
                //console.log(err);
                return reject(err);
            }
            if (row) {
                if (row.status === 'blocked') {
                  return reject("A friendship with status 'blocked' already exists between these users.");
                }
                if (row.status === 'pending'){
                    return reject("There is already a pending request for this user");
                }
                return reject("There is already a friendship between these two users.");
            }
            const query = `INSERT INTO friendships (user_id, friend_id, status, created_at, updated_at)
                            VALUES (?, ?, 'pending', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`;
            db.run(query, [userId, friendId], function(err) {
                if(err){
                    return reject(err);
                }
                resolve(this.lastID);
            })
        })
    });
}

export async function acceptFriendRequest(userId : number, friendId : number) : Promise<void> {
    return new Promise((resolve, reject) => {
        const verifquery = `SELECT * FROM friendships
                            WHERE user_id = ? AND friend_id = ? AND status = 'pending'`;

        db.get(verifquery, [userId, friendId], (err, row: any) => {
            if(err){
                return reject(err);
            }
            if(!row){
                return reject("there is no pending friendship between these two users");
            }
            const query = `UPDATE friendships
                            SET status = 'accepted', updated_at = CURRENT_TIMESTAMP
                            WHERE id = ?`;
            db.run(query, [row.id], function(err) {
                if(err){
                    return reject(err);
                }
                resolve();
            })
        })
    });
}

export async function rejectFriendRequest(userId : number, friendId : number) : Promise<void> {
    return new Promise((resolve, reject) => {
        const verifquery = `
            DELETE FROM friendships 
            WHERE user_id = ? AND friend_id = ? AND status = 'pending'
        `;

        db.run(verifquery, [userId, friendId], function (err) {
            if(err){
                return reject(err);
            }
            if(this.changes === 0){
                return reject("there is no pending friendship between these two users");
            }
            resolve();
        })
    });
}


export async function blockUser(userId : number, friendId : number) : Promise<void> {
    return new Promise((resolve, reject) => {
        const verifquery = `
            DELETE FROM friendships 
            WHERE (user_id = ? AND friend_id = ?) 
            OR (user_id = ? AND friend_id = ?)
        `;

        db.run(verifquery, [friendId, userId, userId, friendId], function (err) {
            if(err){
                return reject(err);
            }
            const insertQuery = `
                INSERT INTO friendships (user_id, friend_id, status, created_at, updated_at)
                VALUES (?, ?, 'blocked', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            `;
        
            db.run(insertQuery, [userId, friendId], function (err) {
                if(err){
                    return reject(err);
                }
                resolve();
            })
        })
    });
}

export async function unblockUser(userId : number, friendId : number) : Promise<void> {
    return new Promise((resolve, reject) => {
        const verifquery = `
            DELETE FROM friendships 
            WHERE 
                ((user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?))
                AND status = 'blocked'
        `;

        db.run(verifquery, [friendId, userId, userId, friendId], function (err) {
            if(err){
                return reject(err);
            }
            if (this.changes === 0) {
                return reject("there is no block between these two users");
            }
            resolve();
        })
    });
}

export async function removeFriend(userId : number, friendId : number) : Promise<void>{
    return new Promise((resolve, reject) => {
        const verifquery = `
            DELETE FROM friendships 
            WHERE ((user_id = ? AND friend_id = ?) 
            OR (user_id = ? AND friend_id = ?)) 
            AND status = 'accepted'
        `;

        db.run(verifquery, [friendId, userId, userId, friendId], function (err) {
            if(err){
                return reject(err);
            }
            if (this.changes === 0) {
                return reject("there is no friendship between these two users");
            }
            resolve();
        })
    });
}

export async function getFriends(userId : number) : Promise<any>{
    return new Promise((resolve, reject) => {
        const query = `
        SELECT u.id, u.username, u.email, u.avatar_url, f.created_at as friendship_date
        FROM friendships f
        JOIN users u ON (
            CASE 
                WHEN f.user_id = ? THEN u.id = f.friend_id
                ELSE u.id = f.user_id
            END
        )
        WHERE (f.user_id = ? OR f.friend_id = ?) 
          AND f.status = 'accepted'
        ORDER BY u.username
        `;

        db.all(query, [userId, userId, userId], function (err, rows) {
            if(err){
                return reject(err);
            }
            resolve(rows);
        })
    });
}

export async function getPendingRequest(userId : number) : Promise<any>{
    return new Promise((resolve, reject) => {
        const query = `
            SELECT u.id, u.username, u.email, u.avatar_url, f.created_at as request_date
            FROM friendships f
            JOIN users u ON u.id = f.user_id
            WHERE f.friend_id = ? AND f.status = 'pending'
            ORDER BY f.created_at DESC
        `;

        db.all(query, [userId], function (err, rows) {
            if(err){
                return reject(err);
            }
            resolve(rows);
        })
    });
}

export async function getSentFriendRequest(userId : number) : Promise<any>{
    return new Promise((resolve, reject) => {
        const query = `
            SELECT u.id, u.username, u.email, u.avatar_url, f.created_at as request_date
            FROM friendships f
            JOIN users u ON u.id = f.friend_id
            WHERE f.user_id = ? AND f.status = 'pending'
            ORDER BY f.created_at DESC
        `;

        db.all(query, [userId], function (err, rows) {
            if(err){
                return reject(err);
            }
            resolve(rows);
        })
    });
}

export async function getBlockedUser(userId : number) : Promise<any>{
    return new Promise((resolve, reject) => {
        const query = `
            SELECT * 
            FROM friendships 
            WHERE status = 'blocked' 
            AND (user_id = ? OR friend_id = ?);
            `;

        db.all(query, [userId, userId], function (err, rows) {
            if(err){
                return reject(err);
            }
            if(rows.length == 0){
                return resolve(null);
            }
            //console.log(rows);
            resolve(rows);
        })
    });
}

export async function getFriendShipStatus(userId : number, friendId : number) : Promise<any>{
    return new Promise((resolve, reject) => {
        const query = `
        SELECT status, 
               CASE 
                   WHEN user_id = ? THEN 'sent'
                   ELSE 'received'
               END as direction
        FROM friendships 
        WHERE (user_id = ? AND friend_id = ?) 
           OR (user_id = ? AND friend_id = ?)
        `;

        db.get(query, [userId, friendId, friendId, userId], function (err, row: any) {
            if(err){
                return reject(err);
            }
            if(!row){
                return resolve({success : true, status : 'none'})
            }
            resolve({success : true, status : row.status, direction : row.direction});
        })
    });
}

export async function searchUser(userId : number, search : string) : Promise<any>{
    return new Promise((resolve, reject) => {
        const query = `
        SELECT u.id, u.username, u.email, u.avatar_url,
               CASE 
                   WHEN f.status IS NULL THEN 'none'
                   ELSE f.status
               END as friendship_status
        FROM users u
        LEFT JOIN friendships f ON (
            (f.user_id = u.id AND f.friend_id = ?) OR 
            (f.user_id = ? AND f.friend_id = u.id)
        )
        WHERE u.id != ? 
          AND (u.username LIKE ? OR u.email LIKE ?)
        ORDER BY u.username
        LIMIT 20
        `;
        const searchPattern = `%${search}%`;

        db.all(query, [userId, userId, userId, searchPattern, searchPattern], function (err, rows) {
            if(err){
                return reject(err);
            }
            resolve(rows);
        })
    });
}