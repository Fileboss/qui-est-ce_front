import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { GameStatus } from '../../models/game.model';

const TERMINAL_STATUSES = new Set<GameStatus>(['PLAYER_1_WINS', 'PLAYER_2_WINS', 'NOT_STARTED']);
import { GameService } from '../../services/game.service';
import { PackService } from '../../services/pack.service';
import { CardDTO } from '../../models/pack.model';
import { GameStatusResponse } from '../../models/game.model';

@Component({
  selector: 'app-player-view',
  imports: [RouterLink],
  templateUrl: './player-view.html',
})
export class PlayerView implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly gameService = inject(GameService);
  private readonly packService = inject(PackService);
  private readonly destroyRef = inject(DestroyRef);

  readonly gameId = signal('');
  readonly player = signal<'player1' | 'player2'>('player1');
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

  ngOnInit(): void {
    const gameId = this.route.snapshot.paramMap.get('gameId') ?? '';
    const player = (this.route.snapshot.paramMap.get('player') ?? 'player1') as 'player1' | 'player2';
    this.gameId.set(gameId);
    this.player.set(player);

    const cached = this.gameService.getCachedCard(gameId, player);
    if (cached) {
      this.secretCard.set(cached);
      this.loadCards(cached.packId);
    } else {
      this.joinGame(gameId, player);
    }

    this.gameService.getAllGames().subscribe({
      next: games => {
        const match = games.find(g => g.gameId === gameId);
        if (match) {
          this.gameStatus.set(match.status);
          if (!TERMINAL_STATUSES.has(match.status)) this.startPolling(gameId);
        }
      },
    });
  }

  private startPolling(gameId: string): void {
    let polling = false;
    const id = setInterval(() => {
      if (polling) return;
      polling = true;
      this.gameService.getAllGames().subscribe({
        next: games => {
          polling = false;
          const match = games.find(g => g.gameId === gameId);
          if (match && match.status !== this.gameStatus()) {
            this.gameStatus.set(match.status);
          }
          if (!match || TERMINAL_STATUSES.has(match.status)) {
            clearInterval(id);
          }
        },
        error: () => { polling = false; },
      });
    }, 3000);
    this.destroyRef.onDestroy(() => clearInterval(id));
  }

  private joinGame(gameId: string, player: 'player1' | 'player2'): void {
    this.joining.set(true);
    this.error.set(null);
    const join$ =
      player === 'player1'
        ? this.gameService.joinPlayer1(gameId)
        : this.gameService.joinPlayer2(gameId);
    join$.subscribe({
      next: card => {
        this.gameService.cacheCard(gameId, player, card);
        this.secretCard.set(card);
        this.joining.set(false);
        this.loadCards(card.packId);
      },
      error: () => {
        this.error.set('Impossible de rejoindre la partie.');
        this.joining.set(false);
      },
    });
  }

  private loadCards(packId: string): void {
    this.loadingCards.set(true);
    this.packService.getCardsByPack(packId).subscribe({
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
    this.gameService.startGame(this.gameId()).subscribe({
      next: response => {
        this.gameStatus.set(response.status);
        this.starting.set(false);
      },
      error: () => {
        this.error.set('Erreur lors du démarrage de la partie.');
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
    if (this.result()?.winner) return;
    this.selectedCardId.set(cardId);
  }

  guess(): void {
    const cardId = this.selectedCardId();
    const gameId = this.gameId();
    if (!cardId || !gameId) return;
    this.guessing.set(true);
    this.error.set(null);
    const guess$ =
      this.player() === 'player1'
        ? this.gameService.guessPlayer1(gameId, cardId)
        : this.gameService.guessPlayer2(gameId, cardId);
    guess$.subscribe({
      next: response => {
        this.result.set(response);
        this.gameStatus.set(response.status);
        if (!response.winner) this.selectedCardId.set(null);
        this.guessing.set(false);
      },
      error: () => {
        this.error.set('Erreur lors de la tentative.');
        this.guessing.set(false);
      },
    });
  }

  playerLabel(): string {
    return this.player() === 'player1' ? 'Joueur 1' : 'Joueur 2';
  }
}
