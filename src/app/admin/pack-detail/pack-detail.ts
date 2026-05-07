import { Component, DestroyRef, ElementRef, inject, OnInit, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { PackService } from '../../services/pack.service';
import { CardDTO, PackDto } from '../../models/pack.model';

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
  readonly pack = signal<PackDto | null>(null);
  readonly cards = signal<CardDTO[]>([]);
  readonly loading = signal(false);
  readonly uploading = signal(false);
  readonly error = signal<string | null>(null);

  readonly newCardName = signal('');
  readonly newCardFile = signal<File | null>(null);
  readonly previewUrl = signal<string | null>(null);

  readonly editingName = signal(false);
  readonly editName = signal('');
  readonly renaming = signal(false);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id') ?? '';
    this.packId.set(id);
    this.loadPack();
    this.loadCards();
  }

  loadPack(): void {
    this.packService
      .getPack(this.packId())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: pack => this.pack.set(pack),
        error: () => this.error.set('Impossible de charger le pack.'),
      });
  }

  startEditName(): void {
    this.editName.set(this.pack()?.name ?? '');
    this.editingName.set(true);
  }

  cancelEditName(): void {
    this.editingName.set(false);
  }

  saveName(): void {
    const name = this.editName().trim();
    if (!name || name === this.pack()?.name) {
      this.editingName.set(false);
      return;
    }
    this.renaming.set(true);
    this.packService
      .updatePack(this.packId(), name)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: updated => {
          this.pack.set(updated);
          this.editingName.set(false);
          this.renaming.set(false);
        },
        error: () => {
          this.error.set('Erreur lors du renommage du pack.');
          this.renaming.set(false);
        },
      });
  }

  onEditNameChange(event: Event): void {
    this.editName.set((event.target as HTMLInputElement).value);
  }

  loadCards(): void {
    this.loading.set(true);
    this.error.set(null);
    this.packService
      .getCardsByPack(this.packId())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
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
    const prev = this.previewUrl();
    if (prev) URL.revokeObjectURL(prev);
    this.newCardFile.set(file);
    this.previewUrl.set(file ? URL.createObjectURL(file) : null);
  }

  uploadCard(): void {
    const name = this.newCardName().trim();
    const file = this.newCardFile();
    if (!name || !file) return;

    this.uploading.set(true);
    this.error.set(null);
    this.packService
      .uploadCard(name, this.packId(), file)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: card => {
          this.cards.update(list => [...list, card]);
          this.newCardName.set('');
          this.newCardFile.set(null);
          const prev = this.previewUrl();
          if (prev) URL.revokeObjectURL(prev);
          this.previewUrl.set(null);
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
    this.packService.deleteCard(id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => this.cards.update(list => list.filter(c => c.id !== id)),
      error: () => this.error.set('Erreur lors de la suppression de la carte.'),
    });
  }
}
