import { inject, Injectable } from '@angular/core';
import { defer, Observable, switchMap } from 'rxjs';
import { retry } from 'rxjs/operators';
import { webSocket } from 'rxjs/webSocket';
import { GameUpdateEvent } from '../models/game.model';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class GameWebSocketService {
  private readonly auth = inject(AuthService);

  private wsBase(): string {
    const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${proto}//${location.host}`;
  }

  connectToGame(gameId: string): Observable<GameUpdateEvent> {
    return defer(() => this.auth.getValidToken()).pipe(
      switchMap(token =>
        webSocket<GameUpdateEvent>(`${this.wsBase()}/ws/game/${gameId}?access_token=${token}`),
      ),
      retry({ delay: 2000, count: 5 }),
    );
  }

  connectToLobby(): Observable<GameUpdateEvent> {
    return defer(() => this.auth.getValidToken()).pipe(
      switchMap(token =>
        webSocket<GameUpdateEvent>(`${this.wsBase()}/ws/games?access_token=${token}`),
      ),
      retry({ delay: 2000, count: 5 }),
    );
  }
}
