import readline from 'readline';
import dotenv from 'dotenv';

dotenv.config();

const API_URL = (process.env.NODE_ENV === "production" ? "https://" : "http://") + 'localhost:3000/api';

let API_KEY= null;
let SESSION = false;

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: 'Game API > '
});

let cli_pong = {}

rl.prompt();

rl.on('line', async (input) => {
    await execute(input);
});

rl.on('close', async () => {
    await execute('finish');
});

rl.on("SIGINT", () => {
    try {
        endGame();
    } catch (error) {
        console.log("\n", error.message);
    }
    console.log("... Exiting game. Goodbye!");
    process.exit();
});


const execute = async (input) => {
    const [command, args] = input.trim().split(' ');
    try {
        switch (command) {
            case 'help':
                help();
                break;
            case 'rules':
                rules();
                break;
            case 'play':
                await ApiKey(args);
                break;
            case 'start':
                await start();
                break;
            case 'score':
                await score(args);
                break;
            case 'status':
                await status();
                break;
            case 'history':
                await history();
                break;
            default:
                console.log('Unknown command, enter "help" to see available commands.');
                break;
        }
    } catch (error) {
        console.log(error.message);
    }
    rl.prompt();
};

const help = () => {
    console.log('help           - show available commands');
    console.log('rules          - show the rules of the game');
    console.log('play [name]    - generate new access key to initiate cli pong');
    console.log('start          - start a game between you and bot');
    console.log('score [name]   - increase the score of [name] by 1');
    console.log('status         - display the status of the game');
    console.log('history        - display your current cli pong game history');
};

const rules = () => {
    console.log('This simple game was made to showcase the capabilities of the Game API.');
    console.log('Rules are the following:\n');
    console.log('1. Use the command  "play [USERNAME]" to generate a new access key and initialize the CLI Pong game.');
    console.log('2. Start a game by typing "start" — this will create a match between you and the bot.');
    console.log(`3. Increase a player's score using "score [name]", where [name] is either your username or "bot".`);
    console.log('4. Type "status" to display the current score and match progress.');
    console.log('5. The game ends automatically when one of the players reaches 5 points.');
    console.log('6. You can exit the game at any time by pressing CTRL+C — the game will be saved and can be resumed later.');
    console.log('7. A new game cannot be started until the previous game is finished or resumed and completed.\n');
};

const ApiKey = async (username) => {
    if (API_KEY && SESSION) {
        throw new Error('Game is already started, please finish it before creating a new one');
    }
    
    const response = await fetch(`${API_URL}/CliToken`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username }),

    });
    if (!response.ok) {
        throw new Error(`Erreur ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    
    cli_pong = {
        player1: username,
        player2: 'bot',
        player1_id: data.userId,
        match_id: 0,
        tournament_id: 0,
        ongoing: false
    };

    API_KEY = data.accesstoken;
    console.log('Access Pong Cli OK. Write "start" to create/resume a game.');
};


const start = async () => {
    if (!API_KEY) {
        throw new Error('Cannot start game without access key. Please use command: play [USERNAME]');
    }
    if (SESSION) {
        throw new Error('Game is already started, please finish it before starting a new one');
    }

    const player1_id = cli_pong.player1_id;
    const player1 =  cli_pong.player1;
    const response = await fetch(`${API_URL}/cli/pong/start`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ player1_id, player1}),

    });

    if (response.status !== 200) {
        throw new Error('Unable to start the game');
    }
    const text = await response.text();
    const data = JSON.parse(text); 
    
    cli_pong.match_id = data.match_id;
    cli_pong.tournament_id = data.tournament_id;
    cli_pong.ongoing = data.ongoing;
    SESSION = true;

    if (cli_pong.ongoing && data.player_id === player1_id)
        console.log(`~ Resuming match ${cli_pong.match_id} ! Write "status" to see the status of the game`);
    else if (cli_pong.ongoing && data.player_id !== player1_id){
        await tournamentPlayer();
    }
    else
        console.log('Game started ! Write "status" to see the status of the game');
};

const score = async (name) => {
    if (!SESSION) {
        throw new Error('Game is not started, please start a game by typing "start"');
    }
    if (!name) {
        throw new Error(`Player name is required: ${cli_pong.player1} or ${cli_pong.player2}`);
    }
    if (name !== cli_pong.player1 && name !== "bot") {
        throw new Error(`Player name error: ${cli_pong.player1} or ${cli_pong.player2}`);
    }

    const match_id = cli_pong.match_id;
    const player_id = name === "bot" ? 1 : cli_pong.player1_id;
    const response = await fetch(`${API_URL}/cli/pong/score`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ player_id, match_id }),

    });

    if (response.status !== 200) {
        throw new Error('Unable to score, please check name and try again');
    }

    const data = await response.json();
    const finish =  data.finish;
    if (finish) {
        console.log(`Too late! The match is finished. Check "status" to find out the winner`);
    } else {
        console.log(`Score updated by 1 for ${name}! Write "status" to see the status of the game`);
    }
};

const status = async () => {
    if (!SESSION) {
        throw new Error('Game is not started, please start a game by typing "start"');
    }
    const match_id = cli_pong.match_id;
    const response = await fetch(`${API_URL}/cli/pong/status`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ match_id }),

    });

    if (response.status !== 200) {
        console.log('Unable to get status, please try again');
    }

    const data = await response.json();
    const p1 = cli_pong.player1;
    const p2 = cli_pong.player2;
    const s1 = data.scores.player1_score;
    const s2 = data.scores.player2_score;

    console.log(`\n========= MATCH STATUS =========`);
    console.log(`Match ID     : ${match_id}`);
    console.log(`Player 1     : ${p1}`);
    console.log(`Player 2     : ${p2}`);
    console.log(`\nSCOREBOARD`);
    console.log(`-----------`);
    console.log(`${p1.padEnd(12)}: ${s1}`);
    console.log(`${p2.padEnd(12)}: ${s2}`);

    if (s1 === 5 || s2 === 5) {
        const winner = s1 === 5 ? p1 : p2;
        const winner_id = winner === p1 ? cli_pong.player1_id : 1;
        console.log(`\n\n >>> [ ${winner} wins ! ] <<<`);
        console.log(` >>> [ THE END ] <<<\n`);
        await endGame(winner_id);
    } else {
        console.log(`\nGame is ongoing. First to 5 wins!`);
    }

    console.log(`===============================\n`);

};

const endGame = async (winner_id) => {
    if (!SESSION) {
        console.log("No game is currently running.");
        return;
    }
    const match_id = cli_pong.match_id;
    const tournament_id = cli_pong.tournament_id;
    const response = await fetch(`${API_URL}/cli/pong/end-game`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ match_id, winner_id, tournament_id }),

    });
    if (response.status !== 200) {
        console.log('Unable to get end game, please try again');
    }

    SESSION = false;
    console.log('Game ended. Write "start" to create a game.');
};


const history = async() => {
    if (!SESSION) {
        throw new Error('Game is not started, please start a game by typing "start"');
    }
    const p1_id = cli_pong.player1_id;
    const response = await fetch(`${API_URL}/cli/pong/display-history`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ p1_id }),

    });

    const data = await response.json();
   
    const p1 = cli_pong.player1;
    const matches = data;

    if (!matches || matches.length === 0) {
        console.log("No match history (yet)");
    } else {
        console.log(`\n========= MATCH HISTORY FOR PLAYER: ${p1} [ID: ${p1_id}] =========\n`);
        
        matches.forEach(match => {
            const winner = match.winner_id === match.player1_id ? p1 : "bot";

            console.log(
                `#Match ID: ${match.id} | ` +
                `${p1}: ${match.player1_score} vs bot: ${match.player2_score} | ` +
                `Winner: ${winner}`
            );
        });

        console.log("\n==========================================================\n");
    }
}

async function tournamentPlayer() {
    const tournament_id = cli_pong.tournament_id;

    const response = await fetch(`${API_URL}/cli/pong/players`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tournament_id }),

    });

    if (!response.ok) {
        console.log('Unable to get the tournament players, please try again');
        return;
    }

    const data = await response.json();
    const p1 = data.username;

    console.log(`!! CLI pong game already ongoing for user ${p1}`);
    console.log(`Please use command: "play ${p1}" to resume pending game`);

    SESSION = false;
}

