import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CardDTO } from '../models/pack.model';
import { GameDTO, GameStatusResponse } from '../models/game.model';

const cardKey = (gameId: string, player: string) => `qui-est-ce-${gameId}-${player}`;

@Injectable({ providedIn: 'root' })
export class GameService {
  private readonly http = inject(HttpClient);
  private readonly base = '/api';

  getAllGames(): Observable<GameDTO[]> {
    return this.http.get<GameDTO[]>(`${this.base}/game`);
  }

  createGame(packId: string): Observable<GameDTO> {
    return this.http.post<GameDTO>(`${this.base}/game/create`, null, { params: { packId } });
  }

  deleteGame(gameId: string): Observable<unknown> {
    return this.http.delete(`${this.base}/game/${gameId}`);
  }

  joinPlayer1(gameId: string): Observable<CardDTO> {
    return this.http.post<CardDTO>(`${this.base}/game/${gameId}/player1/join`, null);
  }

  joinPlayer2(gameId: string): Observable<CardDTO> {
    return this.http.post<CardDTO>(`${this.base}/game/${gameId}/player2/join`, null);
  }

  startGame(gameId: string): Observable<GameStatusResponse> {
    return this.http.post<GameStatusResponse>(`${this.base}/game/${gameId}/start`, null);
  }

  guessPlayer1(gameId: string, cardId: string): Observable<GameStatusResponse> {
    return this.http.post<GameStatusResponse>(`${this.base}/game/${gameId}/player1/guess`, null, {
      params: { cardId },
    });
  }

  guessPlayer2(gameId: string, cardId: string): Observable<GameStatusResponse> {
    return this.http.post<GameStatusResponse>(`${this.base}/game/${gameId}/player2/guess`, null, {
      params: { cardId },
    });
  }

  resetGame(gameId: string): Observable<GameStatusResponse> {
    return this.http.post<GameStatusResponse>(`${this.base}/game/${gameId}/reset`, null);
  }

  getCachedCard(gameId: string, player: 'player1' | 'player2'): CardDTO | null {
    const raw = localStorage.getItem(cardKey(gameId, player));
    if (!raw) return null;
    try {
      return JSON.parse(raw) as CardDTO;
    } catch {
      return null;
    }
  }

  cacheCard(gameId: string, player: 'player1' | 'player2', card: CardDTO): void {
    localStorage.setItem(cardKey(gameId, player), JSON.stringify(card));
  }

  clearGameCache(gameId: string): void {
    localStorage.removeItem(cardKey(gameId, 'player1'));
    localStorage.removeItem(cardKey(gameId, 'player2'));
  }
}
