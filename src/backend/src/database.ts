import sqlite3 from "sqlite3";
import path, { dirname } from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db_path = path.resolve(__dirname, '../db/db.sqlite');

// Maybe this verification is not needed
const dbDir = path.dirname(db_path);
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
    // {recursive: true} create parent directories if they don't exist
}

export const db = new sqlite3.Database(db_path, (err : unknown) => {
    if (err) {
        console.error('Error connecting to the database:', err);
        return;
    }
    initDB();
});

function initDB(): void {
    try{
    db.run('PRAGMA foreign_keys = ON');

    db.run(`
       CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        auth_provider TEXT DEFAULT 'local',
        two_fa_is_active INTEGER NOT NULL DEFAULT 0,
        twofa INTEGER NOT NULL DEFAULT 0,
        isOnline INTEGER NOT NULL DEFAULT 0,
        lastSeen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        avatar_url TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);
    db.run(`
      CREATE TABLE IF NOT EXISTS player_stats (
        user_id INTEGER PRIMARY KEY,
        games_played INTEGER NOT NULL DEFAULT 0,
        games_won INTEGER NOT NULL DEFAULT 0,
        games_lost INTEGER NOT NULL DEFAULT 0,
        tournaments_played INTEGER NOT NULL DEFAULT 0,
        tournaments_won INTEGER NOT NULL DEFAULT 0,
        total_points_scored INTEGER NOT NULL DEFAULT 0,
        total_points_conceded INTEGER NOT NULL DEFAULT 0,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
        )
    `);
    db.run(`
        CREATE TABLE IF NOT EXISTS conversations (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user1_id INTEGER NOT NULL,
          user2_id INTEGER NOT NULL,  
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE (user1_id, user2_id),
          FOREIGN KEY (user1_id) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (user2_id) REFERENCES users(id) ON DELETE CASCADE
        )
    `);
    db.run(`
        CREATE TABLE IF NOT EXISTS chat_messages (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          conversation_id INTEGER NOT NULL,
          sender_id INTEGER NOT NULL,
          receiver_id INTEGER NOT NULL,
          content TEXT NOT NULL,
          read BOOLEAN NOT NULL DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (conversation_id) REFERENCES conversations (id) ON DELETE CASCADE,
          FOREIGN KEY (sender_id) REFERENCES users (id) ON DELETE CASCADE,
          FOREIGN KEY (receiver_id) REFERENCES users (id) ON DELETE CASCADE
        )
    `);
    db.run(`CREATE TABLE IF NOT EXISTS friendships (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          friend_id INTEGER NOT NULL,
          status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'accepted', 'blocked'
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
          FOREIGN KEY (friend_id) REFERENCES users (id) ON DELETE CASCADE,
          UNIQUE(user_id, friend_id)
      );`);

   db.run(`CREATE TABLE IF NOT EXISTS matches (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tournament_id INTEGER NOT NULL,
        round INTEGER NOT NULL,
        player1_id INTEGER NOT NULL,
        player2_id INTEGER NOT NULL,
        player1_score INTEGER DEFAULT 0,
        player2_score INTEGER DEFAULT 0,
        winner_id INTEGER,
        waiter_id INTEGER,
        match_status TEXT DEFAULT 'pending',
        FOREIGN KEY (tournament_id) REFERENCES tournaments(id),
        FOREIGN KEY (player1_id) REFERENCES users(id),
        FOREIGN KEY (player2_id) REFERENCES users(id),
        FOREIGN KEY (winner_id) REFERENCES users(id),
        FOREIGN KEY (waiter_id) REFERENCES users(id)
    );`);

    db.run(`CREATE TABLE IF NOT EXISTS tournament_players (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tournament_id INTEGER NOT NULL,
        player_id INTEGER NOT NULL,
        username TEXT NOT NULL,
        UNIQUE (tournament_id, player_id),
        FOREIGN KEY (tournament_id) REFERENCES tournaments(id),
        FOREIGN KEY (player_id) REFERENCES users(id)
      );`);

    db.run(`CREATE TABLE IF NOT EXISTS tournaments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL CHECK(type IN ('cli', 'ai', 'regular')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        status TEXT DEFAULT 'pending',
        winner_id INTEGER, 
        max_players INTEGER DEFAULT 64,
        participant_count INTEGER DEFAULT 0,
        FOREIGN KEY (winner_id) REFERENCES users(id)
      );`);
    
    console.log('Database initialized');
    }
    catch(err){
        console.error('Error initializing the database:', err);
    }
}

export function addColumnToTable(tableName: string, columnDefinition: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const query = `ALTER TABLE ${tableName} ADD COLUMN ${columnDefinition}`;
      
      db.run(query, (err) => {
        if (err) {
          console.error(`Erreur lors de l'ajout de la colonne: ${err.message}`);
          return reject(err);
        }
        console.log(`Colonne ajoutée avec succès à la table ${tableName}`);
        resolve();
      });
    });
  }

export function closeDB(): void {
    db.close((err : unknown) => {
        if (err) {
            console.error('Error closing the database:', err);
            return;
        }
        console.log('Database closed');
    });
}

process.on('SIGINT', () => {
    closeDB();
    process.exit(0);
  });
  
  process.on('SIGTERM', () => {
    closeDB();
    process.exit(0);
  });