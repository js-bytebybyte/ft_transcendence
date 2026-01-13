import { PADDLE_HEIGHT, PADDLE_WIDHT, BALL_RADIUS, GAME_HEIGHT, GAME_WIDTH, POINTS_PER_ROUND } from "../../../backend/src/Routes/pongConstants.js";
import { userApi } from '../API/api.js'; 
import { authService } from '../API/auth.js';
import { renderTournamentRound } from "./renderTournamentRound.js";
import { setNavbarStatus, setNavbarError } from "../utils.js";
import { router } from "../router.js";

// Clean up any previous keydown/up listeners
window.onkeydown = null;
window.onkeyup = null;

interface GameContext {
    matchId: number;
    isAI: boolean;
    isPlayerInTournament: boolean;
    player1_id: number;
    player2_id: number;
    player1: string;
    player2: string;
    toggleKey: (keyName: string) => void;
    mainElement: HTMLElement;
    tournament_id: number;
    round: number;
    regularTournament: boolean;
    renderer: GameRenderer;
    resultSubmitted: boolean;
}

let currentGame: {
    context: GameContext;
    handlers: ReturnType<typeof createGameHandlers>;
    ws: WebSocket;
} | null = null;


class GameRenderer {
    private ctx: CanvasRenderingContext2D;
    private canvas: HTMLCanvasElement;
    private timerEl: HTMLElement | null;

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Canvas context not available");
        this.ctx = ctx;
        this.timerEl = document.getElementById("timer");
    }
    setTimerEl() {
	    this.timerEl = document.getElementById("timer");
    }

    drawGameState(gameState: any) {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        if (!gameState?.ball || !gameState?.paddle1 || !gameState?.paddle2) {
            // console.error("Incomplete game state");
            return;
        }
        this.ctx.fillStyle = "white";
        this.ctx.beginPath();
        this.ctx.arc(gameState.ball.x, gameState.ball.y, BALL_RADIUS, 0, Math.PI * 2);
        this.ctx.roundRect(10, gameState.paddle1.y, PADDLE_WIDHT, PADDLE_HEIGHT, 8);
        this.ctx.roundRect(
            this.canvas.width - 20, 
            gameState.paddle2.y, 
            PADDLE_WIDHT, 
            PADDLE_HEIGHT, 
            8
        );
        this.ctx.fill();
    }

    showCountdown(seconds: number, callback: () => void) {
        if (!this.timerEl) return;
        
        this.timerEl.textContent = `${seconds}`;
        const interval = setInterval(() => {
            seconds--;
            this.timerEl!.textContent = `${seconds}`;
            if (seconds <= 0) {
                clearInterval(interval);
                callback();
            }
        }, 1000);
    }

    resetTimer() {
        if (this.timerEl) this.timerEl.textContent = "";
    }
}

class GameStateManager {
    private context: GameContext;

    constructor(context: GameContext) {
        this.context = context;
    }

    async handleGameOver(gameState: any) {
        if (this.context.resultSubmitted) return;
        this.context.resultSubmitted = true;

        const winner_id = gameState.player1 === gameState.winner ? gameState.player1_id : gameState.player2_id;

        setNavbarStatus(`GOOD GAME ${gameState.winner} — YOU WON!`);

        const matchId = this.context.matchId;
        this.context.renderer.showCountdown(5, async () => {
            // console.log("🕒 Starting countdown...");
            // console.log("TimerEl:", this.context.renderer['timerEl']);
            try {
                const response = await fetch(
                    (process.env.NODE_ENV === "production"
                        ? "https://" : "http//" )
                            + "localhost:3000/api/ws/pong/reset", 
                    {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ matchId})
                });
                if (!response.ok) {
                    const data = await response.json();
                    throw new Error(data.error || "Unknown reset error");
                }
                // console.log("Game reset triggered");
            } catch (error : any) {
                // console.error("❌ Error during reset:", error.message);
            }
            await this.finalizeMatchResults(winner_id, gameState);
            this.handlePostGame(gameState.winner);
        });
    }

    private async finalizeMatchResults(winnerId: number, gameState: any) {
        const { matchId } = this.context;
        
        await userApi.addMatchResult(
            matchId, 
            gameState.score1, 
            gameState.score2, 
            winnerId
        );

        if (!this.context.regularTournament) {
            await userApi.updateTournamentStatus(this.context.tournament_id, "completed");
            await userApi.addTournamentWinner(this.context.tournament_id, winnerId);
            await userApi.updatePlayerStatsAfterTournament(this.context.tournament_id);
        }
    }

    private handlePostGame(winner: string) {
        this.context.renderer.resetTimer();

        if (winner === "ChatBot")
            winner = "AI";
        
        if (this.context.regularTournament) {
            renderTournamentRound(this.context.mainElement, this.context.tournament_id, this.context.round);
        } else {
            this.context.mainElement.innerHTML = `
                <div class="text-center mt-12">
                    <p class="text-3xl font-bold mb-4">${winner} wins!</p>
                    <button id="play-again-btn" class="px-6 py-2 bg-black text-white rounded-lg">
                        Play Again
                    </button>
                </div>
            `;
            
            document.getElementById('play-again-btn')?.addEventListener('click', () => {
                window.location.href = "/game";
            });
        }
    }
}

function createScore(displayName: string, playerNbr: number): HTMLDivElement {

    const playerScore = document.createElement("div");
    playerScore.className = "inline-flex gap-4 items-center";

    if (displayName === "ChatBot")
        displayName = "ai";

    const name = document.createElement("span");
    name.className = "font-mono text-xl";
    name.innerText = displayName.toUpperCase();

    const scoreDots = document.createElement("span");
    scoreDots.className = "inline-flex items-center gap-1";

    for (let i = 1; i <= POINTS_PER_ROUND; i++) {
        const dot = document.createElement("span");
        dot.className = "w-[18px] aspect-square rounded-full border-2";
        if (playerNbr === 1)
            dot.id = `p1d${i}`;
        else
            dot.id = `p2d${POINTS_PER_ROUND + 1 - i}`;
        scoreDots.append(dot);
    }

    if (playerNbr === 1)
        playerScore.append(name, scoreDots);
    else
        playerScore.append(scoreDots, name);
    
    return (playerScore);
}

function createKey(iconName: string, id: string): HTMLDivElement {
    const key = document.createElement("div");
    key.className = "flex items-center justify-center border-3 rounded-2xl height w-[69px] aspect-square";
    key.id = `${id}-key`;

    const icon = document.createElement("span");
    if (["W", "S"].includes(iconName)) {
        icon.className = "font-mono text-3xl";
    } else {
        icon.className = "nav-symbol text-3xl";
    }

    icon.textContent = iconName;
    icon.id = `${id}-icon`;
    key.append(icon);

    return key;
}

function updateScores(gameState: any) {
    // Clear previous scores
    resetScoreUI();
    
    for (let i = 1; i <= gameState.score1; i++) {
        document.getElementById(`p1d${i}`)?.classList.add("bg-black");
    }
    
    for (let i = 1; i <= gameState.score2; i++) {
        document.getElementById(`p2d${i}`)?.classList.add("bg-black");
    }
}

function resetScoreUI() {
    for (let i = 1; i <= POINTS_PER_ROUND; i++) {
        document.getElementById(`p1d${i}`)?.classList.remove("bg-black");
        document.getElementById(`p2d${i}`)?.classList.remove("bg-black");
    }
}

function createGameHandlers(context: GameContext) {
    return {
        handleStartKey(e: KeyboardEvent) {
            if (!document.hasFocus()) return;
            if (context.isAI && context.isPlayerInTournament) return;
            if (e.key !== 'p') return;
            // console.log("⌨️ key pressed for matchID: ", context.matchId);
            // console.log(`key pressed for match ${context.matchId}`);
            fetch(
                (process.env.NODE_ENV === "production"
                    ? "https://" : "http://") + "localhost:3000/api/ws/pong/start",
                {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ 
                    player1_id: context.player1_id, 
                    matchId: context.matchId 
                })
            });
        },

        handleKeyDown(e: KeyboardEvent) {
            if (!document.hasFocus()) return;
            if (context.isAI && context.isPlayerInTournament) return;
            const allowed = ["ArrowUp", "ArrowDown", "w", "s"];
            if (!allowed.includes(e.key)) return;
            // console.log("⌨️ key released for matchID: ", context.matchId);
            let player_id;
            if (e.key === "w" || e.key === "s") {
                player_id = context.player1_id;
            } else if (e.key === "ArrowUp" || e.key === "ArrowDown") {
                player_id = context.player2_id;
            }

            fetch((process.env.NODE_ENV === "production"
                    ? "https://" : "http://") + "localhost:3000/api/ws/pong/keydown",
                    {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ 
                    key: e.key, 
                    player_id, 
                    matchId: context.matchId 
                }),
            });

            if (!e.repeat) context.toggleKey(e.key);
        },

        handleKeyUp(e: KeyboardEvent) {
            if (!document.hasFocus()) return;
            if (context.isAI && context.isPlayerInTournament) return;
            const allowed = ["ArrowUp", "ArrowDown", "w", "s"];
            if (!allowed.includes(e.key)) return;
            // console.log("⌨️ key pressed for matchID: ", context.matchId);
            
            let player_id;
            if (e.key === "w" || e.key === "s") {
                player_id = context.player1_id;
            } else if (e.key === "ArrowUp" || e.key === "ArrowDown") {
                player_id = context.player2_id;
            }

            fetch(
                (process.env.NODE_ENV === "production"
                    ? "https://" : "http://") + "localhost:3000/api/ws/pong/keyup", 
                {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ 
                    key: e.key, 
                    player_id, 
                    matchId: context.matchId 
                }),
            });
            if (!e.repeat) context.toggleKey(e.key);
        }
    };
}

function cleanupPreviousGame() {
    if (!currentGame) return;
    
    // remove eventlisteners
    window.removeEventListener("keydown", currentGame.handlers.handleStartKey);
    window.removeEventListener("keydown", currentGame.handlers.handleKeyDown);
    window.removeEventListener("keyup", currentGame.handlers.handleKeyUp);
    
    // close WebSocket
    if (currentGame.ws && currentGame.ws.readyState === WebSocket.OPEN) {
        currentGame.ws.close();
    }
    currentGame = null;
}

async function initializeWebSocket(context: GameContext): Promise<WebSocket> {
	const renderer = context.renderer;
	const stateManager = new GameStateManager(context);
	const userId = await authService.getUserId();
	const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
	const wsUrl = `${wsProtocol}//localhost:3000/api/ws/game?userId=${userId}&matchId=${context.matchId}`;

	const ws = new WebSocket(wsUrl);

	ws.onopen = () => {
		// console.log('WebSocket connection established');
		ws.send(JSON.stringify({
			type: 'init_player_gamestate',
			player1: context.player1,
			player1_id: context.player1_id,
			player2: context.player2,
			player2_id: context.player2_id,
			tournament_id: context.tournament_id,
			round: context.round,
			match_id: context.matchId,
			isAI: context.isAI,
			regularTournament: context.regularTournament,
		}));
	};

	ws.onmessage = (event) => {
		const data = JSON.parse(event.data);
        let gameState = data.gameState;

		if (data.type === 'game_update') {
			renderer.drawGameState(gameState);
			updateScores(gameState);
        } else if (data.type === 'reset_game') {
            resetScoreUI();
        }
        if (gameState.status === "stopped" &&
            gameState.winner){
            // console.log("🟥 game over handle init")
            renderer.drawGameState(gameState);
            stateManager.handleGameOver(gameState);
        }
	};

	ws.onerror = (error) => {
		// console.error('WebSocket error:', error);
	};

	ws.onclose = () => {
		// console.log('WebSocket connection closed');
	};

	return ws;
}


interface TournamentCheckResult {
	player1: string;
	isPlayerInTournament: boolean;
	pendingAImatch: boolean;
	tournamentId: number;
}

async function checkOngoingTournaments( type: 'cli' | 'ai' | 'regular', status: string): Promise<TournamentCheckResult> {
	const tournaments = await userApi.getTournamentByTypeAndStatus(type, status);
	if (!tournaments) {
		return {
			player1: '',
			isPlayerInTournament: false,
			pendingAImatch: false,
			tournamentId: -1,
		};
	}

	const currentLoggedUser = await authService.getUserId();
	if (!currentLoggedUser) {
		// console.error("No logged in user");
		return {
			player1: '',
			isPlayerInTournament: false,
			pendingAImatch: false,
			tournamentId: -1,
		};
	}

	const userId = parseInt(currentLoggedUser);
	const { username } = await userApi.getUsernameById(userId);
	if (!username) {
		// console.error("No username found of the loggeduser");
		return {
			player1: '',
			isPlayerInTournament: false,
			pendingAImatch: false,
			tournamentId: -1,
		};
	}

	for (const tournament of tournaments) {
		const players = await userApi.getTournamentPlayers(tournament.id);
		if (players.some(p => p.player_id === userId)) {
			if (tournament.type === 'regular') {
				// console.log("❌ You are already part of a pending regular tournament. Cannot play AI.");
				return {
					player1: username,
					isPlayerInTournament: true,
					pendingAImatch: false,
					tournamentId: tournament.id,
				};
			} else {
				// console.log("❌ there is a pending ai match waiting for you");
				return {
					player1: username,
					isPlayerInTournament: false,
					pendingAImatch: true,
					tournamentId: tournament.id,
				};
			}
		}
	}
	return {
		player1: username,
		isPlayerInTournament: false,
		pendingAImatch: false,
		tournamentId: -1,
	};
}


export async function renderGamePage(mainElement: HTMLElement, matchId: number) {
	// console.log("📄📄 renderGamePage matchId: ", matchId);
    const logged = await authService.isValid();
    if (!logged){
        router.navigate('/home');
        return;
    }

	let regularTournament = false;
	let isAI = false;
	let player1 = "";
	let isPlayerInTournament = false;
	let pendingAImatch = false;

	if (!matchId || matchId === undefined) {
		const aiCheck = await checkOngoingTournaments("ai", "pending");
		player1 = aiCheck.player1;
		isPlayerInTournament = aiCheck.isPlayerInTournament;
		pendingAImatch = aiCheck.pendingAImatch;
		let player1_id = parseInt(await authService.getUserId());

		if (!pendingAImatch) {
			// console.log("🏄🏾‍♀️ create a new AI match");
			const tournament = await userApi.addNewTournament('ai');
			matchId = await userApi.addTournamentMatch(tournament.id, 1, player1_id, 1, null);
			await userApi.addTournamentPlayer(player1_id, player1, tournament.id);
			await userApi.addTournamentPlayer(1, "ai", tournament.id);
			await userApi.updateTournamentStatus(tournament.id, "pending");
		} else {
			// console.log("pending AI tournament id: ", aiCheck.tournamentId);
			if (aiCheck.tournamentId !== -1) {
				matchId = await userApi.getPendingMatchIdForUser(player1_id, aiCheck.tournamentId);
			}
		}

		const regularCheck = await checkOngoingTournaments("regular", "ongoing");
        isPlayerInTournament = regularCheck.isPlayerInTournament;
		if (isPlayerInTournament) {
			// console.log("👑 regular tournament ongoing!!");
		}

		isAI = true;
	} else {
		regularTournament = true;
		isAI = false;
	}

	// GET TOURNAMENT INFO
	// console.log("👉🏼 check info for match id nr: ", matchId);

	// clean previous game
	cleanupPreviousGame();

	// Setup canvas and renderer
	const canvas = document.createElement("canvas");
	canvas.id = "canvas";
	canvas.className = "pong";
	canvas.width = GAME_WIDTH;
	canvas.height = GAME_HEIGHT;

	const renderer = new GameRenderer(canvas);

	// get all match info
	const matchInfo = await userApi.getMatchInfoByMatchId(matchId);
	if (!matchInfo?.id) {
		//// console.error("Match ID is invalid");
		return;
	}

	// build GameContext
	const gameContext: GameContext = {
		matchId,
		isAI: isAI,
		isPlayerInTournament: isPlayerInTournament,
		player1_id: matchInfo.player1_id,
		player2_id: matchInfo.player2_id,
		player1: matchInfo.player1_alias,
		player2: matchInfo.player2_alias,
		toggleKey: (keyName: string) => {
			const key = document.getElementById(`${keyName}-key`);
			const icon = document.getElementById(`${keyName}-icon`);
			key?.classList.toggle("bg-black");
			icon?.classList.toggle("text-white");
		},
		mainElement,
		tournament_id: matchInfo.tournament_id,
		round: matchInfo.round,
		regularTournament: regularTournament,
		renderer,
		resultSubmitted: false
	};

    // console.log(gameContext);

	// setup websocket
	const ws = await initializeWebSocket(gameContext);

	//JST Q? store global
	currentGame = {
		context: gameContext,
		handlers: createGameHandlers(gameContext),
		ws
	};


	// UI setup
    const status = document.getElementById("status");
    if(status){
        status.innerHTML = "Game";
    }
    setNavbarStatus("PRESS THE [P] KEY WHEN YOU ARE READY TO LAUNCH THE GAME");

    const fragment = document.createDocumentFragment();

    const container = document.createElement("div");
    container.className = "flex items-center justify-center";
    canvas.id = "canvas";

    const timer = document.createElement("span");
    timer.className = "absolute font-mono text-white text-9xl";
    timer.id = "timer";

    const leftKeys = document.createElement("div");
    leftKeys.className = "flex flex-col gap-4 m-8";
    leftKeys.append(
        createKey("W", "w"), 
        createKey("S", "s")
    );

    const rightKeys = document.createElement("div");
    rightKeys.className = "flex flex-col gap-4 m-8";
    if (isAI) rightKeys.append(
            createKey("smart_toy", "ai")
    );
    else rightKeys.append(
        createKey("arrow_upward",   "ArrowUp"),
        createKey("arrow_downward", "ArrowDown")
    );

    const scores = document.createElement("div");
    scores.style.width = `${GAME_WIDTH}px`;
    scores.className = "flex justify-between h-[64px] px-6";
    scores.append(
        createScore(gameContext.player1, 1),
        createScore(gameContext.player2, 2)
    );

    if (isAI && isPlayerInTournament) {
        const info = document.createElement("p");
        info.className = "text-center text-red-400 font-mono text-sm my-4 font-semibold";
        info.textContent = "You're already part of an ongoing tournament. Finish your existing match first.";
        fragment.appendChild(info);
    }   
    container.append(leftKeys, canvas, timer, rightKeys);
    fragment.append(container, scores);
    mainElement.textContent = '';
    mainElement.append(fragment);

    // for timer
    renderer.setTimerEl();

    if (isAI) { ////////////////////////////////  RESTYLE AI "KEY", TO BE UPDATED 
        const aiKey = document.getElementById("ai-key");
        const aiIcon = document.getElementById("ai-icon");
        aiKey?.classList.toggle("bg-black");
        aiIcon?.classList.toggle("text-white");
    }

	// 8. Event listeners
	window.addEventListener("keydown", currentGame.handlers.handleStartKey);
	window.addEventListener("keydown", currentGame.handlers.handleKeyDown);
	window.addEventListener("keyup", currentGame.handlers.handleKeyUp);
}

