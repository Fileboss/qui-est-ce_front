import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-game',
  imports: [RouterLink],
  template: `
    <div class="min-h-screen flex flex-col items-center justify-center bg-gray-50">
      <h1 class="text-3xl font-bold text-gray-800 mb-6">Jeu</h1>
      <a routerLink="/" class="text-blue-600 hover:underline">← Retour</a>
    </div>
  `,
})
export class Game {}
