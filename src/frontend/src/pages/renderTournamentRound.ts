import { userApi } from '../API/api.js'; 
import { renderGamePage } from './renderGamePage.js';
import { authService } from '../API/auth.js';
import { router } from '../router.js'
import { setNavbarError, setNavbarStatus } from '../utils.js';

function shuffleArray<T>(array: T[]): T[] {
     return [...array].sort(() => Math.random() - 0.5);
}

export async function renderTournamentRound(
  mainElement: HTMLElement,
  tournamentId: number, 
  roundNumber: number
): Promise<"done" | void> {
  try {

    mainElement.innerHTML = ''; // clear previous content
    setNavbarStatus("PREPARE YOURSELF");
    // if roundNumber = 0; this means that tournament was interrupted
    // need to reinitiate the matchmaking algo
    if (!roundNumber){
      //console.log("get previous match");
      // First check tournament status
        const tournament = await userApi.getOrCreateCurrentTournament('regular');
        // Only keep the round if all matches in it are 'played'.
        if (tournament.status === 'ongoing'){
          roundNumber = await userApi.getLatestCompletedRoundMatches(tournamentId);
        }
    }    
    // get all matches based on the roundNumber
    //console.log(`the tournamentId: ${tournamentId} with round: ${roundNumber}`);
    let matches = await userApi.getMatchesByRoundWithAliases(tournamentId, roundNumber);
    //console.log("renderTournamentRound: ", matches);
    //console.log("number of matches for this round: ", matches.length);
    
    // retrieve all pending matches --> if no match to be played, return back to matchmaking algo
    const pendingMatches = matches.filter(match => match.match_status === 'pending');
    const waiterId = matches.find(m => m.waiter_id !== null)?.waiter_id || null;
    //console.log("Retrieved waiter:", waiterId);

    /* CHECK FOR NEXT ROUND OR WINNER ANOUNCEMENT */
    if (!pendingMatches.length) {
      //console.log(`No remaining matches for round ${roundNumber}`);

      // retrieve winners 
      const winners = await userApi.getMatchWinnersByRound(tournamentId, roundNumber);
      //console.log("The winners:", winners);
      let currentPlayers = winners.map(w => w.winner_id).filter((w): w is number => w !== null);
      //console.log(currentPlayers);

      // check if there is a waiter; add this person to the currentPlayers 
      if (waiterId) {
          currentPlayers.unshift(waiterId);
      }
      // only 1 player ==> the tournament has ended
     if (currentPlayers.length === 1) {

        // update tournament status to completed
        await userApi.updateTournamentStatus(tournamentId, "completed");
        // retrieve winner name
        const winnerId = currentPlayers[0];
        const winnerMatch = matches.find(m => m.winner_id === winnerId);
        const winnerName = winnerMatch?.winner_alias || "Unknown";

        // save winner in tournament
        await userApi.addTournamentWinner(tournamentId, winnerId);

        // store results in userprofile
        await userApi.updatePlayerStatsAfterTournament(tournamentId);

        // deactivate tournament
        const currentLoggedUser = await authService.getUserId();
            if (!currentLoggedUser)
              return;
        await userApi.deactivateTournament(currentLoggedUser);
        setNavbarStatus(`${winnerName.toUpperCase()} - THE PONG TOURNAMENT WINNER`);

        mainElement.innerHTML = `
          <div class="text-center mt-10">
            <h2 class="text-3xl font-bold text-green-500 mb-4">🏆 Tournament Winner 🏆</h2>
            <p class="text-xl text-black">🎉 Congratulations <span class="font-semibold">${winnerName}</span>! You are the champion!</p>
            <button id="go-back-btn" class="mt-6 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              Back to Home
            </button>
          </div>
        `;

        document.getElementById('go-back-btn')?.addEventListener('click', () => {
          window.location.href = "/";
        });

        return;
      }
      
      // shuffle the array of players
      currentPlayers = shuffleArray(currentPlayers);

      // check if there is a waiter
      let newWaiterId : number | null = null;
      if (currentPlayers.length % 2 === 1) {
        newWaiterId = currentPlayers.pop()!;
      }

      // increment the round
      roundNumber++;
      
      // create the new round of matches
      for (let i = 0; i < currentPlayers.length; i += 2) {
        const p1 = currentPlayers[i];
        const p2 = currentPlayers[i + 1];
        await userApi.addTournamentMatch(tournamentId, roundNumber, p1, p2, newWaiterId);
      }
      matches = await userApi.getMatchesByRoundWithAliases(tournamentId, roundNumber);
    }

    // display the history/upcoming matches to be played 
    const upcomingContainer = document.createElement("div");
    const historyContainer = document.createElement("div");
    upcomingContainer.innerHTML = `<h3 class="text-lg font-semibold mt-4">Upcoming Matches</h3>`;
    historyContainer.innerHTML = `<h3 class="text-lg font-semibold mt-4">Match History</h3>`;
    
    // check for each match in the matches array, the status and display stats accordingly
    // Upcoming Matches (Current Round)
    matches.filter(m => m.match_status === 'pending').forEach(match => {
      const row = document.createElement('div');
      row.className = 'bg-gray-700 text-white p-4 my-2 rounded-lg flex justify-between items-center';
      row.innerHTML = `
      <div class="flex flex-col sm:flex-row sm:justify-between sm:items-center w-full gap-2">
      <span class="text-white text-base">[Round ${match.round}] ${match.player1_alias} vs ${match.player2_alias}</span>
      <span class="text-sm text-gray-300">Status: ${match.match_status}</span>
      <button class="bg-green-500 hover:bg-green-600 px-4 py-1 rounded text-sm"
      data-id="${match.id}" 
      data-p1="${match.player1_id}" 
      data-p2="${match.player2_id}"
      data-p1alias="${match.player1_alias}" 
      data-p2alias="${match.player2_alias}">
      Start Match
      </button>
      </div>
      `;
      upcomingContainer.appendChild(row);
    });
    
    // Historical matches
    const playedMatches = await userApi.getAllPlayedMatches(tournamentId);
    playedMatches.forEach(match => {
      const row = document.createElement('div');
      row.className = 'bg-gray-700 text-white p-4 my-2 rounded-lg flex justify-between items-center';
      row.innerHTML = `
        <div class="flex flex-col sm:flex-row sm:justify-between sm:items-center w-full gap-2">
          <span class="text-white text-base">[Round ${match.round}] ${match.player1_alias} vs ${match.player2_alias}</span>
          <span class="text-sm text-gray-300">Status: ${match.match_status}</span>
          <span class="text-sm text-yellow-300">Winner: ${match.winner_alias}</span>
        </div>
      `;
      historyContainer.appendChild(row);
    });
    mainElement.appendChild(upcomingContainer);
    mainElement.appendChild(historyContainer);

    
    // Button to initiate match 
    mainElement.querySelectorAll("button").forEach(btn => {
      btn.addEventListener("click", async () => {
        const matchId = parseInt((btn as HTMLButtonElement).dataset.id!);
        await renderGamePage(mainElement, matchId);
      });
    });
  }
  catch (err) {
    //console.error(`renderTournamentRound error for round ${roundNumber}:`, err);
    // return "error"; // fail-safe return
  }
}