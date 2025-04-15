export type GameStateType = 'idle' | 'connecting' | 'lobby' | 'playing' | 'results' | 'error';

export interface Player {
  id: string;
  name: string;
  score: number;
  isReady: boolean;
  isHost: boolean;
  answers: Array<{
    questionIndex: number;
    answer: number;
    isCorrect: boolean;
  }>;
}

export interface Question {
  id: string;
  question: string;
  options: string[];
  correctOption?: number;
}

export interface GameState {
  gameState: GameStateType;
  players: Player[];
  currentQuestion: Question | null;
  questionNumber: number;
  totalQuestions: number;
  timeLimit: number;
  timeRemaining: number;
  lobbyTimeRemaining: number;
  results: Array<{
    playerId: string;
    score: number;
    rank: number;
  }>;
  errorMessage?: string;
  networkLatency?: number;
  packetLoss?: number;
} 