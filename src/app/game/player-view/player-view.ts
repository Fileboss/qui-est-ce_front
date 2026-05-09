import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { GameStatusResponse } from '../../models/game.model';
import { GameService } from '../../services/game.service';
import { GameWebSocketService } from '../../services/game-websocket.service';
import { PackService } from '../../services/pack.service';
import { CardDTO } from '../../models/pack.model';


@Component({
  selector: 'app-player-view',
  imports: [RouterLink],
  templateUrl: './player-view.html',
})
export class PlayerView implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly gameService = inject(GameService);
  private readonly gameWsService = inject(GameWebSocketService);
  private readonly packService = inject(PackService);
  private readonly destroyRef = inject(DestroyRef);

  readonly gameId = signal('');
  readonly secretCard = signal<CardDTO | null>(null);
  readonly allCards = signal<CardDTO[]>([]);
  readonly selectedCardId = signal<string | null>(null);
  readonly gameStatus = signal<string | null>(null);
  readonly facedDownIds = signal<Set<string>>(new Set());
  readonly joining = signal(false);
  readonly loadingCards = signal(false);
  readonly guessing = signal(false);
  readonly starting = signal(false);
  readonly result = signal<GameStatusResponse | null>(null);
  readonly error = signal<string | null>(null);
  readonly playersJoined = signal<number | null>(null);

  readonly canStart = computed(
    () => this.gameStatus() === 'PREPARING' && (this.playersJoined() ?? 0) >= 2,
  );
  readonly waitingForOpponent = computed(
    () => this.gameStatus() === 'PREPARING' && (this.playersJoined() ?? 0) < 2,
  );

  ngOnInit(): void {
    const gameId = this.route.snapshot.paramMap.get('gameId') ?? '';
    this.gameId.set(gameId);

    const cached = this.gameService.getCachedCard(gameId);
    if (cached) {
      this.secretCard.set(cached);
      this.loadCards(cached.packId);
    } else {
      this.joinGame(gameId);
    }

    this.gameWsService.connectToGame(gameId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: event => {
          if (event.type === 'STATE_CHANGE' && event.gameState) {
            this.gameStatus.set(event.gameState);
          }
          if (event.playersJoined != null) {
            this.playersJoined.set(event.playersJoined);
          }
        },
      });
  }

  private joinGame(gameId: string): void {
    this.joining.set(true);
    this.error.set(null);
    this.gameService.join(gameId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: card => {
        this.gameService.cacheCard(gameId, card);
        this.secretCard.set(card);
        this.playersJoined.update(c => c ?? 1);
        this.joining.set(false);
        this.loadCards(card.packId);
      },
      error: (err: HttpErrorResponse) => {
        this.error.set(
          err.status === 409
            ? 'Cette partie est complète.'
            : 'Impossible de rejoindre la partie.',
        );
        this.joining.set(false);
      },
    });
  }

  private loadCards(packId: string): void {
    this.loadingCards.set(true);
    this.packService.getCardsByPack(packId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: cards => {
        this.allCards.set(cards);
        this.loadingCards.set(false);
      },
      error: () => {
        this.error.set('Impossible de charger les cartes du pack.');
        this.loadingCards.set(false);
      },
    });
  }

  startGame(): void {
    this.starting.set(true);
    this.error.set(null);
    this.gameService
      .startGame(this.gameId())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
      next: () => {
        this.starting.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.error.set(
          err.status === 400
            ? 'Il faut deux joueurs distincts pour démarrer la partie.'
            : 'Erreur lors du démarrage de la partie.',
        );
        this.starting.set(false);
      },
    });
  }

  toggleFaceDown(cardId: string): void {
    this.facedDownIds.update(ids => {
      const next = new Set(ids);
      next.has(cardId) ? next.delete(cardId) : next.add(cardId);
      return next;
    });
  }

  selectCard(cardId: string): void {
    if (this.result()?.correct) return;
    this.selectedCardId.set(cardId);
  }

  guess(): void {
    const cardId = this.selectedCardId();
    const gameId = this.gameId();
    if (!cardId || !gameId) return;
    this.guessing.set(true);
    this.error.set(null);
    this.gameService.guess(gameId, cardId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: response => {
        this.result.set(response);
        if (!response.correct) this.selectedCardId.set(null);
        this.guessing.set(false);
      },
      error: () => {
        this.error.set('Erreur lors de la tentative.');
        this.guessing.set(false);
      },
    });
  }
}
