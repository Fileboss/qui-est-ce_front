import { CardDTO } from './pack.model';

export type GameStatus =
  | 'NOT_STARTED'
  | 'PREPARING'
  | 'STARTED'
  | 'PLAYER_1_WINS'
  | 'PLAYER_2_WINS';

export interface GameDTO {
  gameId: string;
  gameState: GameStatus;
  cards: CardDTO[];
}

export interface GameStatusResponse {
  status: 'Success';
  correct: boolean;
}

export interface GameUpdateEvent {
  gameId: string;
  type: 'GAME_CREATED' | 'STATE_CHANGE' | 'DELETED';
  gameState?: GameStatus;
  correct?: boolean | null;
  playersJoined?: number | null;
}
