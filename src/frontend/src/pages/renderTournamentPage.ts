import { userApi } from '../API/api.js'; 
import { authService } from '../API/auth.js';
import { renderTournamentRound } from './renderTournamentRound.js';
import { sendMessage } from './renderChatBox.js';
import { setNavbarError, setNavbarStatus } from '../utils.js';
import { router } from '../router.js';
export async function renderTournamentPage(mainElement: HTMLElement) {
    const logged = await authService.isValid();
    if (!logged){
        router.navigate('/home');
        return;
    }
  mainElement.innerHTML = `
    <h2 class="text-2xl font-bold mb-4 text-black">Registered Users</h2>
    <div id="players-grid" class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6"></div>


    <div class="mt-10 bg-gray-800 p-6 rounded-2xl shadow-md">
      <h2 class="text-xl font-bold text-white mb-4">Manually add player by alias</h2>
      <div class="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
        <input 
          id="tournament-alias-input" 
          type="text" 
          placeholder="Enter player's alias" 
          class="px-4 text-white py-2 border border-gray-300 rounded-lg w-full sm:w-auto"
        />
        <button 
          id="add-tournament-player-btn" 
          class="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg"
        >
          Add Player
        </button>
      </div>
      <p id="add-alias-error" class="text-red-500 mt-2 hidden"></p>
      <p id="add-alias-success" class="text-green-600 mt-2 hidden"></p>
    </div>

    <div class="mt-6">
      <h2 class="text-xl font-bold text-black mt-10 mb-4">Tournament Players</h2>
      <ol id="tournament-players-list" class="list-disc list-inside text-black">
        <!-- players will be injected here -->
      </ul>
    </div>
      
      </div>
      <div class="mt-6 flex justify-center">
        <button id="start-tournament-btn" class="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-6 rounded-lg">
          Start Tournament
        </button>
      </div>
      <p id="tournament-error" class="text-center text-red-500 mt-4 hidden"></p>
  `;
  

  try 
  {
    setNavbarStatus("TOURNAMENT")
    // check if there is a pending tournament; if not, create one
    // ONLY 1 TOURNAMENT AT THE SAME TIME!
    let currentTournament = await userApi.getOrCreateCurrentTournament("regular");
    const tournamentId = currentTournament.id;
    //log(`The current tournament id = ${tournamentId} -- status : ${currentTournament.status}`);
    
    // returns an array of users with their stats
    const allUsers = await userApi.getAllUsersStats();
    const users = allUsers.filter( user => user.auth_provider === "local" || user.auth_provider === "google");

    // retrieve the currentLoggedUser
    const currentLoggedUser = await authService.getUserId();
    if (!currentLoggedUser)
      return;

    const players_grid = document.getElementById('players-grid');
    if (!players_grid) 
      return;

    /* DISPLAY LOGGED USER (i.e. the evaluator */
    users.forEach(user => {
      // only show other users that you can invite to the tournament
      if (user.id === parseInt(currentLoggedUser)) {

        
        // create and display 'registered' player cards
        const card = document.createElement('div');
        card.className = "bg-gray-600 rounded-2xl p-4 shadow-md flex flex-col items-center text-white";
        card.innerHTML = `
        <img src="${user.avatar_url || '/default-avatar.png'}" alt="${user.username}" class="w-24 h-24 rounded-full mb-3 object-cover" />
        <h3 class="text-lg font-semibold">  ${user.username} </h3>
        <p class="text-sm text-gray-400 mt-1">Games played: ${user.games_played ?? 0}</p>
        <p class="text-sm text-gray-400">Wins: ${user.games_won ?? 0} | Losses: ${user.games_lost ?? 0}</p>
        `;
        players_grid.appendChild(card);
      }
    })

    /* DISPLAY OTHER PLAYER CARDS */
    users.forEach(user => {
      // only show other users that you can invite to the tournament
      if (currentLoggedUser && (user.id !== parseInt(currentLoggedUser))) {
        
        // create and display 'registered' player cards
        const card = document.createElement('div');
        card.className = "bg-gray-800 rounded-2xl p-4 shadow-md flex flex-col items-center text-white";
        card.innerHTML = `
        <img src="${user.avatar_url || '/default-avatar.png'}" alt="${user.username}" class="w-24 h-24 rounded-full mb-3 object-cover" />
        <h3 class="text-lg font-semibold">${user.username}</h3>
        <p class="text-sm text-gray-400 mt-1">Games played: ${user.games_played ?? 0}</p>
        <p class="text-sm text-gray-400">Wins: ${user.games_won ?? 0} | Losses: ${user.games_lost ?? 0}</p>
        `;
        players_grid.appendChild(card);
      }

    });

    /* DISPLAY OTHER TOURNAMENT PLAYERS */
    async function displayTournamentPlayers() {
      const listContainer = document.getElementById('tournament-players-list');
      if (!listContainer) 
        return;
      
      try {
        const players = await userApi.getTournamentPlayers(tournamentId);
        //console.log("number of players to display: ", players);
        listContainer.innerHTML = '';
        
        if (players.length === 0) {
          listContainer.innerHTML = '<li class="text-gray-500">No players added yet.</li>';
        } else {
          players.forEach(p => {
            const li = document.createElement('li');
            li.textContent = p.username;
            listContainer.appendChild(li);
          });
        }
      } catch (err) {
        listContainer.innerHTML = '<li class="text-red-500">Error loading tournament players.</li>';
      }
    }
    
    await displayTournamentPlayers();
    
    /* HANDLE MANUAL ALIAS PLAYER INPUT FOR TOURNAMENT */
    const addPlayerAliasBtn = document.getElementById('add-tournament-player-btn') as HTMLButtonElement;
    const aliasInput = document.getElementById('tournament-alias-input') as HTMLInputElement;
    const errorMsg = document.getElementById('add-alias-error');
    const successMsg = document.getElementById('add-alias-success');
    if (!errorMsg || !successMsg)
      return;
    
    // if tournament is already ongoing, cannot add another player
    if (addPlayerAliasBtn && currentTournament.status === "ongoing"){
      addPlayerAliasBtn.disabled = true;
      errorMsg.textContent = "You can no longer add a player to the ongoing tournament";
      errorMsg?.classList.remove('hidden');

    }

    addPlayerAliasBtn?.addEventListener('click', async () => {
      const alias = aliasInput.value.trim();
      errorMsg?.classList.add('hidden');
      successMsg?.classList.add('hidden');

      if (!alias) {
        errorMsg.textContent = "Alias cannot be empty.";
        errorMsg?.classList.remove('hidden');
        return;
      }
      
      // check if alias exists -> check if username exists
      const findUser = users.find( user => user.username === alias);
      if (!findUser) {
        errorMsg.textContent = `No registered user found with alias "${alias}"`;
        errorMsg?.classList.remove('hidden');
        return
      }

      try {
        const currentUserId = await authService.getUserId();
        const response = await userApi.addTournamentPlayer(findUser.id, findUser.username, tournamentId);
        //console.log(response);
        if (response) {
          successMsg.textContent = `Player "${alias}" successfully added to tournament.`;
          successMsg?.classList.remove('hidden');
          aliasInput.value = "";
          await displayTournamentPlayers();
          if(currentUserId != findUser.id.toString()){
            await sendMessage(`Hey i just invited you to play a pong game, come play on my computer!`, findUser.id.toString());
          }
        } else {
          errorMsg.textContent = `Failed to add "${alias}".`;
          errorMsg?.classList.remove('hidden');
        }
      } catch (err) {
        errorMsg.textContent = "Something went wrong while adding the player.";
        errorMsg?.classList.remove('hidden');
      }
    });

  
    /* START TOURNAMENT LOGIC */
    function shuffleArray<T>(array: T[]): T[] {
      return [...array].sort(() => Math.random() - 0.5);
    }
    
    const startTournmentBtn = document.getElementById('start-tournament-btn') as HTMLButtonElement;
    if (!startTournmentBtn)
      return;
    if (startTournmentBtn && currentTournament.status === "ongoing"){
      startTournmentBtn.textContent = 'Resume Tournament';
      try {
        await userApi.activateTournament(currentLoggedUser);
      } catch (error: any) {
        setNavbarError(error);
        startTournmentBtn.disabled = true;
          startTournmentBtn.textContent = 'Blocked';
          startTournmentBtn.classList.remove("bg-green-600");
          startTournmentBtn.classList.remove("hover:bg-green-700");
          startTournmentBtn.classList.add("bg-red-500");
        }
        
    }
    const tournamentStartErrorMsg = document.getElementById('tournament-error');

    startTournmentBtn?.addEventListener('click', async () => {
      const players = await userApi.getTournamentPlayers(tournamentId);
      // console.log("return getTournamentPlayers: ", players);
      // console.log("Number of tournament players: ", players.length); 
      if (players.length < 2){
        tournamentStartErrorMsg!.textContent = "Need at least 2 players to start tournament";
        tournamentStartErrorMsg!.classList.remove('hidden');
        return;
      }
      const isPlayerInTournament = players.find( player => player.player_id === parseInt(currentLoggedUser))
      if (!isPlayerInTournament) {
        tournamentStartErrorMsg!.textContent = "Cannot start tournament without you in it";
        tournamentStartErrorMsg!.classList.remove('hidden');
        return;
      }
      try {
          await userApi.activateTournament(currentLoggedUser);
      } catch (error: any) {
          setNavbarError(error);
      }
      try {
        // check the status of the current Tournament
        if (currentTournament.status === "ongoing") {
          // TO DO: change return; a tournament can have status = ongoing but 
          // first round of matches can have status ='played' so pendingRoundNumber = 0
          const pendingRoundNumber = await userApi.getPendingRoundForTournament(tournamentId);
          await renderTournamentRound(mainElement, tournamentId, pendingRoundNumber);
        }
        else {
          await userApi.updateTournamentStatus(tournamentId, "ongoing");
          const playersIdArray = players.map( player => player['player_id']);
          let currentPlayers = [...playersIdArray];
          let roundNumber = 1;
          let waiterId: number | null = null;

          currentPlayers = shuffleArray(currentPlayers);
          if (currentPlayers.length % 2 === 1) {
            waiterId = currentPlayers.pop()!;
          }

          // create the first round of matches if tournament 
          for (let i = 0; i < currentPlayers.length; i += 2) {
            const p1 = currentPlayers[i];
            const p2 = currentPlayers[i + 1];
            await userApi.addTournamentMatch(tournamentId, roundNumber, p1, p2, waiterId);
          }

          // display the tournament rounds until the end
          await renderTournamentRound(mainElement, tournamentId, roundNumber);
        }
      } catch (error){
        //console.log('Failure generating matches: ', error );
      }
    });
  } 
  catch (err) {
    //console.error('Failed to fetch users:', err);
    mainElement.innerHTML += `<p class="text-red-500 mt-4">Failed to load players.</p>`;
  }
}