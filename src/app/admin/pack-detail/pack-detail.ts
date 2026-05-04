import { Component, DestroyRef, ElementRef, inject, OnInit, signal, viewChild } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { PackService } from '../../services/pack.service';
import { CardDTO } from '../../models/pack.model';

@Component({
  selector: 'app-pack-detail',
  imports: [RouterLink],
  templateUrl: './pack-detail.html',
})
export class PackDetail implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly packService = inject(PackService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly fileInput = viewChild.required<ElementRef<HTMLInputElement>>('fileInput');

  readonly packId = signal('');
  readonly cards = signal<CardDTO[]>([]);
  readonly loading = signal(false);
  readonly uploading = signal(false);
  readonly error = signal<string | null>(null);
  readonly deleteNotice = signal(false);

  readonly newCardName = signal('');
  readonly newCardFile = signal<File | null>(null);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id') ?? '';
    this.packId.set(id);
    this.loadCards();
  }

  loadCards(): void {
    this.loading.set(true);
    this.error.set(null);
    this.packService.getCardsByPack(this.packId()).subscribe({
      next: cards => {
        this.cards.set(cards);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Impossible de charger les cartes.');
        this.loading.set(false);
      },
    });
  }

  onCardNameChange(event: Event): void {
    this.newCardName.set((event.target as HTMLInputElement).value);
  }

  onFileChange(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0] ?? null;
    this.newCardFile.set(file);
  }

  uploadCard(): void {
    const name = this.newCardName().trim();
    const file = this.newCardFile();
    if (!name || !file) return;

    this.uploading.set(true);
    this.error.set(null);
    this.packService.uploadCard(name, this.packId(), file).subscribe({
      next: card => {
        this.cards.update(list => [...list, card]);
        this.newCardName.set('');
        this.newCardFile.set(null);
        this.fileInput().nativeElement.value = '';
        this.uploading.set(false);
      },
      error: () => {
        this.error.set("Erreur lors de l'ajout de la carte.");
        this.uploading.set(false);
      },
    });
  }

  deleteCard(id: string): void {
    this.deleteNotice.set(true);
    this.packService.deleteCard(id).subscribe();
    const timer = setTimeout(() => this.deleteNotice.set(false), 3000);
    this.destroyRef.onDestroy(() => clearTimeout(timer));
  }
}
