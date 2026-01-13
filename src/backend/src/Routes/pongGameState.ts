export type Vec2 = { x: number; y: number };

export type GameState = {
  tournament_id: number;
  round: number;
  match_id: number;
  player1: string;
  player2: string;
  player1_id: number;
  player2_id: number;
  paddle1: Vec2;
  paddle2: Vec2;
  paddle_speed: number;
  ball: Vec2 & { vx: number; vy: number };
  score1: number;
  score2: number;
  status: "running" | "reset" | "stopped";
  lastPointTimestamp: number;
  isAI?: boolean;
  regularTournament: boolean;
  winner?: string; 
};