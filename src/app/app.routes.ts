import { Routes } from '@angular/router';
import { Home } from './home/home';

export const routes: Routes = [
  { path: '', component: Home },
  { path: 'admin', loadComponent: () => import('./admin/admin').then(m => m.Admin) },
  {
    path: 'admin/packs/:id',
    loadComponent: () => import('./admin/pack-detail/pack-detail').then(m => m.PackDetail),
  },
  { path: 'game', loadComponent: () => import('./game/game').then(m => m.Game) },
  {
    path: 'game/:gameId/:player',
    loadComponent: () => import('./game/player-view/player-view').then(m => m.PlayerView),
  },
];
