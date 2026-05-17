import { inject, Injectable } from '@angular/core';
import { defer, Observable, switchMap } from 'rxjs';
import { retry } from 'rxjs/operators';
import { webSocket } from 'rxjs/webSocket';
import { GameDTO, GameUpdateEvent } from '../models/game.model';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class GameWebSocketService {
  private readonly auth = inject(AuthService);
  private readonly CARRIER = 'bearer-token-carrier';

  private wsBase(): string {
    const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${proto}//${location.host}`;
  }

  private authProtocols(token: string): string[] {
    const header = encodeURIComponent(`quarkus-http-upgrade#Authorization#Bearer ${token}`);
    return [this.CARRIER, header];
  }

  connectToGame(gameId: string): Observable<GameUpdateEvent> {
    return defer(() => this.auth.getValidToken()).pipe(
      switchMap(token =>
        webSocket<GameUpdateEvent>({
          url: `${this.wsBase()}/ws/game/${gameId}`,
          protocol: this.authProtocols(token),
        }),
      ),
      retry({ delay: 2000, count: 5 }),
    );
  }

  connectToLobby(): Observable<GameUpdateEvent | GameDTO[]> {
    return defer(() => this.auth.getValidToken()).pipe(
      switchMap(token =>
        webSocket<GameUpdateEvent | GameDTO[]>({
          url: `${this.wsBase()}/ws/games`,
          protocol: this.authProtocols(token),
        }),
      ),
      retry({ delay: 2000, count: 5 }),
    );
  }
}
