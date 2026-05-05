import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { retry } from 'rxjs/operators';
import { webSocket } from 'rxjs/webSocket';
import { GameUpdateEvent } from '../models/game.model';

@Injectable({ providedIn: 'root' })
export class GameWebSocketService {
  private wsBase(): string {
    const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${proto}//${location.host}`;
  }

  connectToGame(gameId: string): Observable<GameUpdateEvent> {
    return webSocket<GameUpdateEvent>(`${this.wsBase()}/ws/game/${gameId}`).pipe(
      retry({ delay: 2000, count: 5 }),
    );
  }

  connectToLobby(): Observable<GameUpdateEvent> {
    return webSocket<GameUpdateEvent>(`${this.wsBase()}/ws/games`).pipe(
      retry({ delay: 2000, count: 5 }),
    );
  }
}
