export type GameStatus =
  | 'NOT_STARTED'
  | 'PREPARING'
  | 'STARTED'
  | 'PLAYER_1_WINS'
  | 'PLAYER_2_WINS';

export interface GameStatusResponse {
  status: GameStatus;
  gameId: string;
  errorMessage: string | null;
  winner: boolean;
}
