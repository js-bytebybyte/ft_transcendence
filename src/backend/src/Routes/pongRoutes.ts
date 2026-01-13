import { FastifyPluginAsync } from "fastify";
import { createInitialGameState, updateGameState, movePlayer1, movePlayer2, resetGameStateInPlace } from './pongGameLoop.js';
import { getOrCreateCurrentTournament,
            addTournamentMatch,
            updateTournamentStatus,
            updateMatchScore,
            getMatchScores,
            updateMatchStatusToPlayed,
            updatePlayerStatsAfterTournament,
            addTournamentWinner,
            addTournamentPlayer,
            getPendingMatchInfo,
            getHistoricalMatches,
            getAllMatchesByTournament,
            getTournamentPlayers} from "../services/TournamentService.js";

import { GameState } from "./pongGameState.js";

const gameStates = new Map<string, GameState>(); // gameState per match_id
const matchClients = new Map<string, Set<WebSocket>>(); // link socket with matchid
const keysHeldMap = new Map<string, Map<string, Set<string>>>(); // each match has userid with map of keys

const pongRoutes: FastifyPluginAsync = async (server : any) => 
{
    server.get("/ws/game", { websocket: true }, (socket : any, request : any) => {
      const { userId, matchId } = request.query as { userId: string, matchId: string };

      // init the map with a socket linked to the matchid
      // each socket should have the same game state
      if (!matchClients.has(matchId)) {
        matchClients.set(matchId, new Set());
      }
      matchClients.get(matchId)!.add(socket);

      // nested map that tracks the keys per user_id per match_id
      // JST Q: i should only save the users in the keysHeldMap that are part of the match?
      if (!keysHeldMap.has(matchId)) {
        keysHeldMap.set(matchId, new Map());
      }
      if (!keysHeldMap.get(matchId)!.has(userId)) {
        keysHeldMap.get(matchId)!.set(userId, new Set());
      }
      
      socket.on('message', async (message: any) => {
        try {
          const data = JSON.parse(message.toString());
          if (data.type === 'init_player_gamestate') {
           // init game state if it doesn't exist
             if (!gameStates.has(matchId)) {
              gameStates.set(matchId, createInitialGameState(data));
              const gameState = gameStates.get(matchId)!;
              // console.log(`✅ WebSocket matchId: ${matchId}`);
              // console.log(gameState);
              if (!keysHeldMap.has(matchId)) {
                keysHeldMap.set(matchId, new Map());
              }
              const playerKeyMap = keysHeldMap.get(matchId)!;
              [data.player1_id, data.player2_id].forEach((id) => {
                const idStr = id.toString();
                if (!playerKeyMap.has(idStr)) {
                  playerKeyMap.set(idStr, new Set());
                }
              });
              socket.send(JSON.stringify({
                    type: 'init_gamestate_done',
                    gameState: gameState,
              }));
            }
          }
        } catch (error) {
          //console.error('Erreur de parsing JSON:', error);
          socket.send(JSON.stringify({
            type: 'error',
            message: 'Format de message invalide'
          }));
        }
      })

      socket.on("close", () => {
        matchClients.get(matchId)?.delete(socket);
        //  if no clients left, clean up
        if (matchClients.get(matchId)?.size === 0) {
          gameStates.delete(matchId);
          keysHeldMap.delete(matchId);
          matchClients.delete(matchId);
        }
      }); 
    });


    /* 
    Game loop (60 FPS) >> broadcast to all users of a match
     The game loop is a repeating function ( ~60 times per second) that:
     - Reads inputs (which keys are currently held down by each player),
     - Updates the game state (ball position, paddle movement, score, etc.),
     - Broadcasts the new game state to all clients watching the match.
    */

    setInterval(() => {
      for (const [matchId, gameState] of gameStates.entries()) {
        const playerKeyMap = keysHeldMap.get(matchId) ?? new Map();

        //update the gamestate for each matchid, using key inputs
        updateGameState(gameState, playerKeyMap);

        //broadcast the new game state to all players in this match
        const clients = matchClients.get(matchId);
        if (clients) {
          for (const client of clients) {
            if (client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify({type: 'game_update', gameState: gameState}))
            }
          }
        }
    }}, 1000 / 60);

    server.post("/ws/pong/start", async (request: any, reply: any) => {
      try {
        const { player1_id, matchId }  = request.body as { player1_id: string, matchId: string};
        //console.log(typeof player1_id);
        //console.log(typeof matchId);
        const gameState = gameStates.get((matchId.toString()));
        if (!gameState){
          return reply.code(401).send({error: "No game state found in start pong game"});
        }
        //console.log(`start: ${matchId} - ${gameState}`);
        // let isMatchPlayer = false; 
        // if (gameState.player1_id === parseInt(userId) || gameState.player2_id === parseInt(userId))
        //   isMatchPlayer = true;
        // if (isMatchPlayer) {
          if (gameState.status === "stopped")
            gameState.status = "running";
          else
            gameState.status = "stopped";
        // }
        //console.log(`[ ${gameState.isAI} ]`);
        reply.code(200).send({gameState: gameState});
      } catch(error){
          //console.log(error);
          return reply.code(500).send({error: 'Error while starting pong game'});
      }
    });

    server.post("/ws/pong/reset", async (request: any, reply: any) => {
      const { matchId }  = request.body as { matchId: string};
      try {
        const gameState = gameStates.get((matchId.toString()));
        if (!gameState){
          return reply.code(401).send({error: "No game state found in reset pong game"});
        }
        resetGameStateInPlace(gameState);
        //console.log("🔄 Game has been reset");
        const clients = matchClients.get(matchId.toString());
        if (clients) {
          for (const client of clients) {
            if (client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify({ type: 'reset_game', gameState: gameState }));
            }
          }
        }
        reply.code(200).send(gameState);
        cleanMatch(matchId);
      } catch(error) {
        //console.log(error);
        return reply.code(500).send({error: 'Error while reseting pong game'});
      }
    });

    
    server.post("/ws/pong/keydown", async (request: any, reply: any) => {
      const { key, player_id, matchId } = request.body as { key: string, player_id: string, matchId: string };
      try {
        //console.log(`keydown: ${player_id} - ${matchId}`);
  
        let playerKeyMap = keysHeldMap.get(matchId.toString());
        if (!playerKeyMap) {
          playerKeyMap = new Map();
          keysHeldMap.set(matchId, playerKeyMap);
        }
  
        let playerKeys = playerKeyMap.get(player_id.toString());
        if (!playerKeys) {
          playerKeys = new Set();
          playerKeyMap.set(player_id, playerKeys);
        }
  
        playerKeys.add(key);
        reply.code(200).send(); 

      } catch(error) {
          //console.log(error);
          return reply.code(500).send({error: 'Error while pressing keydown pong game'});
      }
    });

    server.post("/ws/pong/keyup", async (request: any, reply: any) => {
      const { key, player_id, matchId } = request.body as { key: string, player_id: string, matchId: string };

      try {
        const playerKeyMap = keysHeldMap.get(matchId.toString());
        if (!playerKeyMap) return reply.code(404).send();
  
        const playerKeys = playerKeyMap.get(player_id.toString());
        if (!playerKeys) return reply.code(404).send();
  
        playerKeys.delete(key);
        reply.code(200).send();
      } catch(error) {
          //console.log(error);
          return reply.code(500).send({error: 'Error while releasing key pong game'});
      }

    });

    
    function cleanMatch(matchId: string) {
      // Remove the game state
      gameStates.delete(matchId);

      // Close all WebSocket connections for this match (optional but good practice)
      const clients = matchClients.get(matchId);
      if (clients) {
        for (const ws of clients) {
          try {
            ws.close();
          } catch (err) {
            //console.error(`Error closing socket for match ${matchId}:`, err);
          }
        }
      }
      // Remove the client set from the map
      matchClients.delete(matchId);
      keysHeldMap.delete(matchId); 
    }

  /* -------------------- CLI PONG GAME ROUTES -------------------------- */

  // check if there is a match already ongoing;
  // if yes : 2 cases: either it's ongoing for the current player or it's another player
  // - if current player --> get pending match info
  // - if another player --> get that match info
  // if not:
  // - create new tournament id
  // - add the tournament players
  // - add tournament match
  // - change the tournament status to ongoing

  server.post("/cli/pong/start", async (request: any, reply: any) => {
      const {player1_id, player1 } = request.body as {player1_id: number, player1: string}
      let match_id : number | null = null;
      let tournament_id;
      let ongoing; // boolean to check if new match or ongoing
      let player_id;
      try {
        // get the first pending/onging tournament
        const tournament = await getOrCreateCurrentTournament("cli");
        tournament_id = tournament.id;
        //console.log(`tournament: ${tournament.id} - status: ${tournament.status}`);
        if (tournament.status === 'ongoing') {
          ongoing = true;
          // check if current player has an ongoing match
          //console.log(`need to check if ongoing tournament is for the current player`);
          const pendingMatch = await getPendingMatchInfo(player1_id);
          if (pendingMatch) {
            match_id = pendingMatch.id;
            player_id = pendingMatch.player1_id;
          }
          else {
            //console.log(`there is another cli pong game ongoing for tournament ${tournament_id}`);
            const match = await getAllMatchesByTournament(tournament_id);
            if (match) {
              match_id = match.id;
              player_id = match.player1_id;
            }
          }
        } else {
          player_id = player1_id;
          await addTournamentPlayer(player1_id, player1, tournament_id);
          await addTournamentPlayer(1, "bot", tournament_id);
          match_id = await addTournamentMatch(tournament_id, 1, player1_id, 1, null);
          await updateTournamentStatus(tournament_id, "ongoing");
        }
        //console.log(`cli match id: ${match_id}`);
        reply.code(200).send({match_id, tournament_id, ongoing, player_id});
      } catch (error){
        reply.code(501).send({error: "Error start CLI pong"});
      }
  });

  server.post("/cli/pong/players", async (request: any, reply: any) => {
    const { tournament_id } = request.body as { tournament_id: number };

    try {
      const players = await getTournamentPlayers(tournament_id);
      const humanPlayer = players.find((p: any) => p.username !== "bot"); // no bot player 
      if (!humanPlayer) {
        return reply.code(404).send({ error: "No human player found in this tournament" });
      }
      reply.code(200).send({ id: humanPlayer.id, username: humanPlayer.username });
    } catch (error) {
      reply.code(501).send({ error: "Error tournament players cli pong" });
    }
  });

  
  server.post("/cli/pong/score", async (request: any, reply: any) => {
      const {player_id, match_id} = request.body as { player_id: number, match_id: number };
      try {
        let finish = false; // boolean to check if game should end
        const scores = await getMatchScores(match_id);
        if (scores && (scores.player1_score === 5 || scores.player2_score === 5)){
          finish = true;
        }
        else  {
          await updateMatchScore(match_id, player_id);
        }
        reply.code(200).send({scores, finish});
      } catch (error){
        reply.code(501).send({error: "Error increasing the CLI pong game score"});
      }
  });

  server.post("/cli/pong/status", async (request: any, reply: any) => {
      const {match_id} = request.body as {match_id: number}
      //console.log(`STATUS for CLI pong match id:  ${match_id}`);
      try {
        const scores = await getMatchScores(match_id)
        reply.code(200).send({scores});
      } catch (error){
        reply.code(501).send({error: "Error retrieval the CLI pong game status"});
      }
  });

  server.post("/cli/pong/end-game", async (request: any, reply : any) => {
    try {
      const { match_id, winner_id, tournament_id } = request.body as { 
        match_id: number, 
        winner_id: number, 
        tournament_id: number};
      const scores = await getMatchScores(match_id);
      if (scores && (scores.player1_score === 5 || scores.player2_score === 5)){
        const success = await updateMatchStatusToPlayed(match_id, winner_id);
        if (!success) {
          return reply.code(400).send({ error: "Failed to update match status" });
        }
        await addTournamentWinner(tournament_id, winner_id);
        await updateTournamentStatus(tournament_id, "completed");
        await updatePlayerStatsAfterTournament(tournament_id);
      }
      reply.code(200).send(true);
    } catch (error) {
      //console.error("CLI Pong End Game Error:", error);
      reply.code(501).send({ error: "Error during end-game" });
    }
  });

  server.post("/cli/pong/display-history", async (request: any, reply: any) => {
    try {
      const { p1_id } = request.body as { p1_id: number};
      const matchesHistory = await getHistoricalMatches(p1_id);
      reply.code(200).send(matchesHistory);
    } catch (error) {
      //console.error("CLI Pong End Game Error:", error);
      reply.code(501).send({ error: "Error during history display" });
    }
  });

};

export default pongRoutes;
