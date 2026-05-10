import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { UserService } from '../../services/user.service';

@Component({
  selector: 'app-admin-users',
  imports: [RouterLink],
  templateUrl: './admin-users.html',
})
export class AdminUsers {
  private readonly userService = inject(UserService);
  private readonly destroyRef = inject(DestroyRef);

  readonly username = signal('');
  readonly password = signal('');
  readonly role = signal<'player' | 'admin'>('player');
  readonly submitting = signal(false);
  readonly error = signal<string | null>(null);
  readonly success = signal(false);

  readonly canSubmit = computed(
    () => this.username().trim().length >= 3 && this.password().length >= 12 && !this.submitting(),
  );

  onUsernameChange(event: Event): void {
    this.username.set((event.target as HTMLInputElement).value);
  }

  onPasswordChange(event: Event): void {
    this.password.set((event.target as HTMLInputElement).value);
  }

  onRoleChange(event: Event): void {
    this.role.set((event.target as HTMLSelectElement).value as 'player' | 'admin');
  }

  createUser(): void {
    if (!this.canSubmit()) return;
    this.submitting.set(true);
    this.error.set(null);
    this.success.set(false);
    this.userService
      .createUser({ username: this.username().trim(), password: this.password(), role: this.role() })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.success.set(true);
          this.username.set('');
          this.password.set('');
          this.role.set('player');
          this.submitting.set(false);
        },
        error: () => {
          this.error.set("Erreur lors de la création de l'utilisateur.");
          this.submitting.set(false);
        },
      });
  }
}
