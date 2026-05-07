import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { PackService } from '../services/pack.service';
import { PackDto } from '../models/pack.model';

@Component({
  selector: 'app-admin',
  imports: [RouterLink],
  templateUrl: './admin.html',
})
export class Admin implements OnInit {
  private readonly packService = inject(PackService);
  private readonly destroyRef = inject(DestroyRef);

  readonly packs = signal<PackDto[]>([]);
  readonly loading = signal(false);
  readonly creating = signal(false);
  readonly newPackName = signal('');
  readonly error = signal<string | null>(null);

  ngOnInit(): void {
    this.loadPacks();
  }

  loadPacks(): void {
    this.loading.set(true);
    this.error.set(null);
    this.packService.getAllPacks().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: packs => {
        this.packs.set(packs);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Impossible de charger les packs.');
        this.loading.set(false);
      },
    });
  }

  createPack(): void {
    const name = this.newPackName().trim();
    if (!name) return;

    this.creating.set(true);
    this.error.set(null);
    this.packService.createPack(name).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: pack => {
        this.packs.update(list => [...list, pack]);
        this.newPackName.set('');
        this.creating.set(false);
      },
      error: () => {
        this.error.set('Erreur lors de la création du pack.');
        this.creating.set(false);
      },
    });
  }

  onPackNameChange(event: Event): void {
    this.newPackName.set((event.target as HTMLInputElement).value);
  }

  deletePack(id: string): void {
    this.packService.deletePack(id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => this.packs.update(list => list.filter(p => p.id !== id)),
      error: () => this.error.set('Erreur lors de la suppression du pack.'),
    });
  }
}
