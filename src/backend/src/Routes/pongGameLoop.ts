import { GameState, Vec2 } from "./pongGameState.js";
import { GAME_WIDTH, GAME_HEIGHT, PADDLE_HEIGHT, PADDLE_WIDHT, BALL_RADIUS, PADDLE_SPEED, BALL_SPEED, PADDLE_MARGIN, POINTS_PER_ROUND } from "./pongConstants.js";

export function createInitialGameState(data: any): GameState {
  const speed = BALL_SPEED; // base speed
  const maxAngle = Math.PI / 3; // 60°
  const angle = Math.random() * 2 * maxAngle - maxAngle;
  const direction = Math.random() > 0.5 ? 1 : -1;
  return {
    tournament_id: data.tournament_id,
    round: data.round,
    match_id: data.match_id,
    player1: data.player1,
    player2: data.player2,
    player1_id: data.player1_id,
    player2_id: data.player2_id,
    paddle1: { x: 10, y: GAME_HEIGHT / 2 - PADDLE_HEIGHT / 2 },
    paddle2: { x: GAME_WIDTH - 20, y: GAME_HEIGHT / 2 - PADDLE_HEIGHT / 2 },
    paddle_speed: PADDLE_SPEED,
    ball: {
      x: GAME_WIDTH / 2,
      y: GAME_HEIGHT / 2,
      vx: direction * speed * Math.cos(angle),
      vy: speed * Math.sin(angle),
    },
    score1: 0,
    score2: 0,
    status: "stopped",
    lastPointTimestamp: Date.now(),
    isAI: data.isAI,
    regularTournament: data.regularTournament
    // winner: undefined, 
  };
}

export function resetGameStateInPlace(state: GameState) {
  // state.tournament_id = -1;
  // state.round = -1;
  // state.match_id = -1;
  // state.player1 = "player1";
  // state.player2 = "player2";
  // state.player1_id = -1;
  // state.player2_id = -1;
  state.paddle1 = { x: 10, y: GAME_HEIGHT / 2 - PADDLE_HEIGHT / 2 };
  state.paddle2 = { x: GAME_WIDTH - 20, y: GAME_HEIGHT / 2 - PADDLE_HEIGHT / 2 };
  state.paddle_speed = PADDLE_SPEED;
  state.ball = {
    x: GAME_WIDTH / 2,
    y: GAME_HEIGHT / 2,
    vx: 5 * (Math.random() > 0.5 ? 1 : -1),
    vy: 5 * (Math.random() > 0.5 ? 1 : -1),
  };
  state.score1 = 0;
  state.score2 = 0;
  state.status = "stopped";
  state.winner = undefined;
  // state.isAI = false;
  // state.regularTournament = false;
}

export function movePlayer1(state: GameState, direction: string)
{
  // Move paddles
  if (direction === "up") state.paddle1.y = Math.max(PADDLE_MARGIN, state.paddle1.y - PADDLE_SPEED);
  if (direction === "down") state.paddle1.y = Math.min(GAME_HEIGHT - PADDLE_HEIGHT - PADDLE_MARGIN, state.paddle1.y + PADDLE_SPEED);

}

export function movePlayer2(state: GameState, direction: string)
{
  // Move paddles
  if (direction === "up") state.paddle2.y = Math.max(PADDLE_MARGIN, state.paddle2.y - PADDLE_SPEED);
  if (direction === "down") state.paddle2.y = Math.min(GAME_HEIGHT - PADDLE_HEIGHT - PADDLE_MARGIN, state.paddle2.y + PADDLE_SPEED);

}

export function updateGameState(state: GameState, playerKeyMap: Map<string, Set<string>>){

  if (state.status === "stopped" || state.status === "reset") 
    return; // do not update the game when you stop

  if (Date.now() - state.lastPointTimestamp < 1000)
    return;


  const p1_id = state.player1_id.toString();
  const p2_id = state.player2_id.toString();

  // handle player1 movement only for the userId of the players 
  if (p1_id && playerKeyMap.has(p1_id)){
    const keys = playerKeyMap.get(p1_id);
    if (!keys)
      return;
    if (keys.has("w"))
      movePlayer1(state, "up");
    if (keys.has("s"))
      movePlayer1(state, "down");
  }


  if (!state.isAI) {
    if(p2_id && playerKeyMap.has(p2_id)) {
      const keys = playerKeyMap.get(p2_id);
      if (!keys)
        return; 
      if (keys.has("ArrowUp"))
        movePlayer2(state, "up");
      if (keys.has("ArrowDown"))
        movePlayer2(state, "down");
    }
  }
  if (state.isAI) { // ai function 
    const paddleCenter = state.paddle2.y + PADDLE_HEIGHT / 2;
    const predictedBallY = state.ball.y + 
      (state.ball.vy * (state.paddle2.x - state.ball.x)) / state.ball.vx;

    const targetY = Math.min(
      Math.max(predictedBallY - PADDLE_HEIGHT / 2, 0),
      GAME_HEIGHT - PADDLE_HEIGHT
    );

    if (paddleCenter < targetY - 10) {
      state.paddle2.y = Math.min(GAME_HEIGHT - PADDLE_HEIGHT, state.paddle2.y + PADDLE_SPEED);
    } else if (paddleCenter > targetY + 10) {
      state.paddle2.y = Math.max(0, state.paddle2.y - PADDLE_SPEED);
    }
  }

  // Move ball
  state.ball.x += state.ball.vx;
  state.ball.y += state.ball.vy;

  // Wall collision
  if (state.ball.y <= 0 || state.ball.y >= GAME_HEIGHT) 
    state.ball.vy *= -1;

  // Paddle - Ball collision 
  checkBallPaddleCollision(state.paddle1, state.ball);
  checkBallPaddleCollision(state.paddle2, state.ball);

  // Update the scores 
  if (state.ball.x < 0) {
    state.score2 += 1;
    resetBall(state, "left");
  }
  if (state.ball.x > GAME_WIDTH) {
    state.score1 += 1;
    resetBall(state, "right");
  }

  // check for the winner;
  if (state.score1 >= POINTS_PER_ROUND) {
    state.status = "stopped";
    state.winner = state.player1;
  }

  if (state.score2 >= POINTS_PER_ROUND) {
    state.status = "stopped";
    state.winner = state.player2;
  }

}

function checkBallPaddleCollision(paddle: Vec2, ball: Vec2 & { vx: number; vy: number }): void {
  const paddleWidth = PADDLE_WIDHT;
  const closestX = Math.max(paddle.x, Math.min(ball.x, paddle.x + paddleWidth));
  const closestY = Math.max(paddle.y, Math.min(ball.y, paddle.y + PADDLE_HEIGHT));

  const dx = Math.abs(ball.x - closestX);
  const dy = Math.abs(ball.y - closestY);

  if (dx * dx + dy * dy <= BALL_RADIUS * BALL_RADIUS) {
    if (ball.x < GAME_WIDTH / 2) {
      ball.vx = Math.abs(ball.vx); // bounce right
      ball.x = paddle.x + paddleWidth + BALL_RADIUS;
    } else {
      ball.vx = -Math.abs(ball.vx); // bounce left
      ball.x = paddle.x - BALL_RADIUS;
    }
  }
}

function resetBall(state: GameState, loserSide: string): void {
  state.ball.x = GAME_WIDTH / 2;
  state.ball.y = GAME_HEIGHT / 2;

  
  let maxAngle = Math.PI / 3;
  let ballAngle = Math.random() * 2 * maxAngle - maxAngle;
  let speed = BALL_SPEED;

  const direction = loserSide === "left" ? 1 : -1;

  state.ball.vx = direction * speed * Math.cos(ballAngle);
  state.ball.vy = speed * Math.sin(ballAngle);
  state.lastPointTimestamp = Date.now();

}
