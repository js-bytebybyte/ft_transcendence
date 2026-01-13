 import {db} from "../database.js";

export async function getAllUsersWithStats(): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const query = `
    SELECT
      u.id, u.username, u.avatar_url, u.auth_provider,
      ps.games_played, ps.games_won, ps.games_lost,
      ps.tournaments_played, ps.tournaments_won,
      ps.total_points_scored, ps.total_points_conceded
    FROM users u
    LEFT JOIN player_stats ps ON ps.user_id = u.id
    `;
    db.all(query, [], (err, rows) => {
      if (err) {
        return reject(err);
      }
      resolve(rows);
    });
  });
}

/* 
    Check if there is already a tournament that is 'pending' or 'ongoing'.
    If yes → return that tournament.
    If no → create a new tournament with status 'pending', and return that one instead.
*/

export async function getOrCreateCurrentTournament(type: 'cli' | 'ai' | 'regular') : Promise<any> {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT * 
      FROM tournaments
      WHERE status IN ('pending', 'ongoing') AND type = ?
      ORDER BY created_at DESC
      LIMIT 1
    `;
    db.get(query, [type], (error, row) => {
      if (error)
        return reject(error);
      if (row)
        return resolve(row);

      // No active tournament of this type -> create one
      const timestamp = new Date().toISOString();

      const insertQuery = `
        INSERT INTO tournaments (type, created_at, status, max_players, participant_count)
        VALUES (?, ?, 'pending', 64, 0)
      `;
      db.run(insertQuery, [type, timestamp], function (insertError) {
        if (insertError)
          return reject(insertError);

        const newTournament = {
          id: this.lastID,
          type,
          created_at: timestamp,
          status: 'pending',
          winner_id: null,
          max_players: 64,
          participant_count: 0
        };
        resolve(newTournament);
      });
    });
  });
}


export async function addNewTournament(type: 'cli' | 'ai' | 'regular') : Promise<any> {
  return new Promise((resolve, reject) => {
    // No active tournament of this type -> create one
    const timestamp = new Date().toISOString();
    const insertQuery = `
      INSERT INTO tournaments (type, created_at, status, max_players, participant_count)
      VALUES (?, ?, 'pending', 64, 0)
    `;
    db.run(insertQuery, [type, timestamp], function (insertError) {
      if (insertError)
        return reject(insertError);

      const newTournament = {
        id: this.lastID,
        type,
        created_at: timestamp,
        status: 'pending',
        winner_id: null,
        max_players: 64,
        participant_count: 0
      };
      resolve(newTournament);
    });
  });
}

export async function getLatestCompletedRoundNumber(tournamentId: number): Promise<number | null> {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT round
      FROM matches
      WHERE tournament_id = ?
      GROUP BY round
      HAVING COUNT(*) = SUM(CASE WHEN match_status = 'played' THEN 1 ELSE 0 END)
      ORDER BY round DESC
      LIMIT 1;
    `;

     db.get<{round: number}>(query, [tournamentId], (err, row) => {
      if (err) 
        return reject(err);
      resolve(row ? row.round : null);
    });
  });
}

export async function getTournamentByTypeAndStatus(
  type: 'cli' | 'ai' | 'regular',
  status: string
): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT *
      FROM tournaments
      WHERE type = ?
        AND status = ?
    `;
    db.all(query, [type, status], (err, rows: any[]) => {
      if (err) {
        return reject(err);
      }
      resolve(rows);
    });
  });
}



export async function updateTournamentStatus(tournament_id : number, status: string) : Promise<boolean> {
  return new Promise( (resolve, reject) => {
    const query = `
      UPDATE tournaments
      SET status = ?
      WHERE id = ?
    `;
    db.run(query, [status, tournament_id], (error) => {
      if (error) return reject(error);
      return resolve(true);
    })
  });
}

export async function getPendingRoundForTournament(tournamentId: number): Promise<number | null> {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT round
      FROM matches
      WHERE tournament_id = ?
        AND match_status = 'pending'
      ORDER BY round ASC
      LIMIT 1
    `;
    db.get<{round: number}>(query, [tournamentId], (err, row) => {
      if (err) return reject(err);
      resolve(row?.round ?? null);
    });
  });
}


export async function addTournamentPlayer(player_id: number, username: string, tournament_id: number): Promise<any> {
  return new Promise( (resolve, reject) => {
    const query = `
      INSERT INTO tournament_players (player_id, username, tournament_id)
      VALUES (?, ?, ?)
    `;

    db.run(query, [player_id, username, tournament_id], (error) => {
      if (error) {
        // youn can only add the same player once to the tournament
        if (error.message.includes('UNIQUE constraint failed')) {
          return reject(new Error("Player already added to this tournament"));
        }
        return reject(error);
      }
      // if no error, increase participant_count in tournaments table
      const updateQuery = `
        UPDATE tournaments
        SET participant_count = participant_count + 1
        WHERE id = ?
      `;
      db.run(updateQuery, [tournament_id], function(error) {
        if (error) 
          return reject(error);
        return resolve(true);
      });
    });
    }
  );
}

export async function getTournamentPlayers(tournament_id: number): Promise<any> {
    return new Promise ( (resolve, reject) => {
        const query = `
            SELECT player_id, username
            FROM tournament_players
            WHERE tournament_id = ?
        `;
        db.all(query, [tournament_id], (error, rows) => {
            if (error)
                return reject(error);
            resolve(rows);
        })
    })
}

export async function addTournamentMatch(
  tournament_id: number,
  round: number,
  player1_id: number,
  player2_id: number,
  waiter_id: number | null // ← optional waiter
): Promise<number> {
  return new Promise((resolve, reject) => {
    const query = `
      INSERT INTO matches (
        tournament_id,
        round,
        player1_id,
        player2_id,
        waiter_id
      )
      VALUES (?, ?, ?, ?, ?)
    `;
    db.run( query, [tournament_id, round, player1_id, player2_id, waiter_id], function (error) {
      if (error) {
        return reject(error);
      }
      resolve(this.lastID);
    });
  });
}


// JST TO DO: need to change the input param --> should be player_id 
export async function deleteTournamentPlayer(alias: string) : Promise<void>{
    return new Promise((resolve, reject) => {
        const verifquery = `
            DELETE FROM tournament_players 
            WHERE alias = ? 
        `;

        db.run(verifquery, [alias], function (err) {
            if(err){
                return reject(err);
            }
            if (this.changes === 0) {
                return reject(`${alias} is not participating in the tournament`);
            }
            resolve();
        })
    });
}

export async function addTournamentWinner(tournament_id: number, winner_id: number) : Promise<boolean> {
  return new Promise( (resolve, reject) => {
    const query = `
      UPDATE tournaments
      SET winner_id = ?
      WHERE id = ?
    `;
    db.run(query, [winner_id, tournament_id], (error) => {
      if (error)
        return reject(error);
      resolve(true);
    })
  })
}

export async function getMatchesByRound(matchRound: number): Promise<any> {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT * 
      FROM matches
      WHERE round = ? 
      ORDER BY id ASC`;
    db.all(query, [matchRound], (error, rows) => {
      if (error) return reject(error);
      resolve(rows);
    });
  });
}

export async function getMatchesByRoundWithAliases(
  tournamentId: number, 
  roundNumber: number): Promise<any> 
{
  return new Promise((resolve, reject) => {
    const query = `
      SELECT 
        m.id,
        m.tournament_id,
        m.round,
        m.player1_id,
        u1.username AS player1_alias,
        m.player2_id,
        u2.username AS player2_alias,
        m.player1_score,
        m.player2_score,
        m.winner_id,
        uw.username AS winner_alias,
        m.waiter_id,
        uwait.username AS waiter_alias,
        m.match_status
      FROM matches m
      JOIN users u1 ON m.player1_id = u1.id
      JOIN users u2 ON m.player2_id = u2.id
      LEFT JOIN users uw ON m.winner_id = uw.id
      LEFT JOIN users uwait ON m.waiter_id = uwait.id
      WHERE m.tournament_id = ? AND m.round = ?
    `;
    db.all(query, [tournamentId, roundNumber], (error, rows) => {
      if (error) return reject(error);
      resolve(rows);
    });
  });
}

export async function updateMatchResult(
  id: number, 
  player1_score: number,
  player2_score: number, 
  winner_id: number): Promise<any> 
{
  return new Promise((resolve, reject) => {
    const updateQuery = `
      UPDATE matches
      SET player1_score = ?, player2_score = ?, winner_id = ?, match_status = 'played'
      WHERE id = ?
    `;

    // console.log(`[DB] Executing UPDATE with values:`, {
    //   id,
    //   player1_score,
    //   player2_score,
    //   winner_id
    // });

    db.run(updateQuery, [player1_score, player2_score, winner_id, id], function (err) {
      if (err) return reject(err);
      console.log(`[DB] Updated rows: ${this.changes}`);
      resolve({ success: true, updated_game_id: id });
    });
  });
}

export async function updateMatchScore(match_id: number, player_id: number): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const query = `
      UPDATE matches
      SET
        player1_score = CASE WHEN player1_id = ? THEN player1_score + 1 ELSE player1_score END,
        player2_score = CASE WHEN player2_id = ? THEN player2_score + 1 ELSE player2_score END
      WHERE id = ?
    `;

    db.run(query, [player_id, player_id, match_id], function (error) {
      if (error) {
        return reject(error);
      }
      resolve(true);
    });
  });
}

export async function getMatchScores(match_id: number): Promise<{ player1_score: number, player2_score: number }> {
  return new Promise((resolve, reject) => {
    const query = `SELECT player1_score, player2_score FROM matches WHERE id = ?`;

    db.get(query, [match_id], (err, row : { player1_score: number, player2_score: number }) => {
      if (err) return reject(err);
      resolve({ player1_score: row.player1_score, player2_score: row.player2_score });
    });
  });
}


// for debugging 
export function getMatchById(id: number): Promise<any> {
  return new Promise((resolve, reject) => {
    const query = `
    SELECT * 
    FROM matches 
    WHERE id = ?`;
    db.get(query, [id], (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });
}

export async function updateMatchStatusToPlayed(match_id: number, winner_id: number): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const query = `
      UPDATE matches
      SET
        match_status = 'played',
        winner_id = ?
      WHERE id = ?
    `;

    db.run(query, [winner_id, match_id], function (error) {
      if (error) return reject(error);
      resolve(true);
    });
  });
}


export async function getMatchWinnersByRound(tournamendId: number, matchRound: number): Promise<any> {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT winner_id
      FROM matches 
      WHERE round = ? AND tournament_id = ? AND winner_id IS NOT NULL
      `;
    db.all(query, [matchRound, tournamendId], (error, rows) => {
      if (error) return reject(error);
      resolve(rows);
    });
  });
}

export async function updatePlayerStatsAfterTournament(tournamentId: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const query = `
    WITH tournament_info AS (
      SELECT id, participant_count, winner_id
      FROM tournaments
      WHERE id = ?
    ),
    match_data AS (
      SELECT 
        m.player1_id AS user_id,
        m.player1_score AS scored,
        m.player2_score AS conceded,
        CASE WHEN m.winner_id = m.player1_id THEN 1 ELSE 0 END AS won,
        CASE WHEN m.winner_id != m.player1_id THEN 1 ELSE 0 END AS lost
      FROM matches m
      WHERE m.tournament_id = ?

      UNION ALL

      SELECT 
        m.player2_id AS user_id,
        m.player2_score AS scored,
        m.player1_score AS conceded,
        CASE WHEN m.winner_id = m.player2_id THEN 1 ELSE 0 END AS won,
        CASE WHEN m.winner_id != m.player2_id THEN 1 ELSE 0 END AS lost
      FROM matches m
      WHERE m.tournament_id = ?
    )
    INSERT INTO player_stats (
      user_id, games_played, games_won, games_lost, 
      tournaments_played, tournaments_won, 
      total_points_scored, total_points_conceded
    )
    SELECT 
      md.user_id,
      COUNT(*) AS games_played,
      SUM(won) AS games_won,
      SUM(lost) AS games_lost,
      CASE WHEN ti.participant_count > 2 THEN 1 ELSE 0 END AS tournaments_played,
      CASE 
        WHEN ti.participant_count > 2 AND md.user_id = ti.winner_id THEN 1 
        ELSE 0 
      END AS tournaments_won,
      SUM(scored) AS total_points_scored,
      SUM(conceded) AS total_points_conceded
    FROM match_data md
    CROSS JOIN tournament_info ti
    GROUP BY md.user_id
    ON CONFLICT(user_id) DO UPDATE SET
      games_played = games_played + excluded.games_played,
      games_won = games_won + excluded.games_won,
      games_lost = games_lost + excluded.games_lost,
      tournaments_played = tournaments_played + excluded.tournaments_played,
      tournaments_won = tournaments_won + excluded.tournaments_won,
      total_points_scored = total_points_scored + excluded.total_points_scored,
      total_points_conceded = total_points_conceded + excluded.total_points_conceded,
      updated_at = CURRENT_TIMESTAMP`;


    db.run(query, [tournamentId, tournamentId, tournamentId], (err) => {
      if (err) return reject(err);
      resolve();
    });
  });
}

export async function getMatchInfoByMatchId(matchId: number): Promise<any> 
{
  return new Promise((resolve, reject) => {
    const query = `
      SELECT 
        m.id,
        m.tournament_id,
        m.round,
        m.player1_id,
        u1.username AS player1_alias,
        m.player2_id,
        u2.username AS player2_alias,
        m.player1_score,
        m.player2_score,
        m.winner_id,
        uw.username AS winner_alias,
        m.waiter_id,
        uwait.username AS waiter_alias,
        m.match_status
      FROM matches m
      JOIN users u1 ON m.player1_id = u1.id
      JOIN users u2 ON m.player2_id = u2.id
      LEFT JOIN users uw ON m.winner_id = uw.id
      LEFT JOIN users uwait ON m.waiter_id = uwait.id
      WHERE m.id = ?
    `;
    db.get(query, [matchId], (error, row) => {
      if (error) return reject(error);
      resolve(row);
    });
  });
}

export async function getAllPlayedMatches(tournamentId: number): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT 
        m.*,
        tp1.username AS player1_alias,
        tp2.username AS player2_alias,
        tpw.username AS winner_alias
      FROM matches m
      LEFT JOIN tournament_players tp1 
        ON m.player1_id = tp1.player_id AND m.tournament_id = tp1.tournament_id
      LEFT JOIN tournament_players tp2 
        ON m.player2_id = tp2.player_id AND m.tournament_id = tp2.tournament_id
      LEFT JOIN tournament_players tpw 
        ON m.winner_id = tpw.player_id AND m.tournament_id = tpw.tournament_id
      WHERE m.tournament_id = ?
        AND m.match_status = 'played'
      ORDER BY m.round ASC, m.id ASC;
    `;
    db.all(query, [tournamentId], (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

export async function getTournamentIdByMatchId(matchId: number): Promise<number> {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT tournament_id
      FROM matches 
      WHERE id = ?
    `;
    db.get(query,[matchId], (error, row : any) => {
        if (error) 
          return reject(error);
        if (!row) 
          return reject(new Error('No tournament found for match'));
        resolve(row.tournament_id);
      }
    );
  });
}

// for CLI PONG 
export async function getAllMatchesByTournament(tournamentId: number): Promise<any> {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT *
      FROM matches 
      WHERE tournament_id = ?
      LIMIT 1
    `;
    db.get(query,[tournamentId], (error, row : any) => {
        if (error) 
          return reject(error);
        if (!row) 
          return reject(new Error('No match for given tournament found'));
        resolve(row);
      }
    );
  });
}

export function getPendingMatchInfo(userId: number): Promise<any | null> {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT *
      FROM matches
      WHERE player1_id = ?
        AND match_status = 'pending'
      LIMIT 1
    `;
    db.get(query, [userId], (err, row) => {
      if (err) return reject(err);
      resolve(row || null);
    });
  });
}

export function getPendingMatchIdForUser(userId: number, tournamentId: number): Promise<number | null> {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT id
      FROM matches
      WHERE tournament_id = ?
        AND (player1_id = ? OR player2_id = ?)
        AND match_status = 'pending'
      LIMIT 1
    `;
    db.get(query, [tournamentId, userId, userId], (err: any, row: any) => {
      if (err) return reject(err);
      resolve(row ? row.id : null);
    });
  });
}



export function getHistoricalMatches(cliUserId: number): Promise<any[]> {
  return new Promise((resolve, reject) => {
     const query = `
      SELECT *
      FROM matches
      WHERE player1_id = ?
        AND match_status = 'played'
      ORDER BY id DESC
    `;
    db.all(query, [cliUserId], (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}
