import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink, Router } from '@angular/router';
import { NgClass } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { PackService } from '../services/pack.service';
import { GameService } from '../services/game.service';
import { GameWebSocketService } from '../services/game-websocket.service';
import { PackDto } from '../models/pack.model';
import { GameDTO, GameStatus } from '../models/game.model';

const STATUS_CLASSES: Record<GameStatus, string> = {
  PREPARING: 'bg-amber-100 text-amber-700',
  STARTED: 'bg-green-100 text-green-700',
  PLAYER_1_WINS: 'bg-blue-100 text-blue-700',
  PLAYER_2_WINS: 'bg-blue-100 text-blue-700',
  NOT_STARTED: 'bg-gray-100 text-gray-600',
};

const STATUS_LABELS: Record<GameStatus, string> = {
  PREPARING: 'En préparation',
  STARTED: 'En cours',
  PLAYER_1_WINS: 'Joueur 1 gagne',
  PLAYER_2_WINS: 'Joueur 2 gagne',
  NOT_STARTED: 'Non démarrée',
};

@Component({
  selector: 'app-game',
  imports: [RouterLink, NgClass],
  templateUrl: './game.html',
})
export class Game implements OnInit {
  private readonly gameService = inject(GameService);
  private readonly gameWsService = inject(GameWebSocketService);
  private readonly packService = inject(PackService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly games = signal<GameDTO[]>([]);
  readonly packs = signal<PackDto[]>([]);
  readonly selectedPackId = signal('');
  readonly loading = signal(false);
  readonly creating = signal(false);
  readonly joining = signal(false);
  readonly startingGameId = signal<string | null>(null);
  readonly error = signal<string | null>(null);

  ngOnInit(): void {
    this.loading.set(true);
    this.packService.getAllPacks().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: packs => this.packs.set(packs),
      error: () => this.error.set('Impossible de charger les packs.'),
    });
    this.gameWsService.connectToLobby()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: msg => {
          if (Array.isArray(msg)) {
            this.games.set(msg);
            this.loading.set(false);
            return;
          }
          if (msg.type === 'GAME_CREATED') this.loadGames();
          if (msg.type === 'DELETED') {
            this.games.update(list => list.filter(g => g.gameId !== msg.gameId));
          }
        },
        error: () => {
          this.error.set('Impossible de charger les parties.');
          this.loading.set(false);
        },
      });
  }

  loadGames(): void {
    this.loading.set(true);
    this.error.set(null);
    this.gameService.getAllGames().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: games => {
        this.games.set(games);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Impossible de charger les parties.');
        this.loading.set(false);
      },
    });
  }

  onPackChange(event: Event): void {
    this.selectedPackId.set((event.target as HTMLSelectElement).value);
  }

  createGame(): void {
    const packId = this.selectedPackId();
    if (!packId) return;
    this.creating.set(true);
    this.error.set(null);
    this.gameService.createGame(packId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: game => {
        this.games.update(list => [...list, game]);
        this.selectedPackId.set('');
        this.creating.set(false);
      },
      error: () => {
        this.error.set('Erreur lors de la création de la partie.');
        this.creating.set(false);
      },
    });
  }

  join(gameId: string): void {
    this.joining.set(true);
    this.error.set(null);
    this.gameService.join(gameId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: card => {
        this.gameService.cacheCard(gameId, card);
        this.joining.set(false);
        this.router.navigate(['/game', gameId]);
      },
      error: (err: HttpErrorResponse) => {
        this.error.set(
          err.status === 409
            ? 'Cette partie est complète.'
            : 'Erreur lors de la connexion au jeu.',
        );
        this.joining.set(false);
      },
    });
  }

  startGame(gameId: string): void {
    this.startingGameId.set(gameId);
    this.error.set(null);
    this.gameService.startGame(gameId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.loadGames();
        this.startingGameId.set(null);
      },
      error: (err: HttpErrorResponse) => {
        this.error.set(
          err.status === 400
            ? 'Il faut deux joueurs distincts pour démarrer la partie.'
            : 'Erreur lors du démarrage de la partie.',
        );
        this.startingGameId.set(null);
      },
    });
  }

  deleteGame(gameId: string): void {
    this.error.set(null);
    this.gameService.deleteGame(gameId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.gameService.clearGameCache(gameId);
        this.games.update(list => list.filter(g => g.gameId !== gameId));
      },
      error: () => this.error.set('Erreur lors de la suppression.'),
    });
  }

  resetGame(gameId: string): void {
    this.error.set(null);
    this.gameService.resetGame(gameId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.gameService.clearGameCache(gameId);
        this.loadGames();
      },
      error: () => this.error.set('Erreur lors du redémarrage.'),
    });
  }

  isJoined(gameId: string): boolean {
    return this.gameService.getCachedCard(gameId) !== null;
  }

  statusBadgeClass(status: GameStatus): string {
    return STATUS_CLASSES[status];
  }

  statusLabel(status: GameStatus): string {
    return STATUS_LABELS[status];
  }
}
