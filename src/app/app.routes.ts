import { Routes } from '@angular/router';
import { Home } from './home/home';
import { adminGuard, playerGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: '', component: Home },
  {
    path: 'admin',
    loadComponent: () => import('./admin/admin').then(m => m.Admin),
    canActivate: [adminGuard],
  },
  {
    path: 'admin/packs/:id',
    loadComponent: () => import('./admin/pack-detail/pack-detail').then(m => m.PackDetail),
    canActivate: [adminGuard],
  },
  {
    path: 'admin/users',
    loadComponent: () => import('./admin/admin-users/admin-users').then(m => m.AdminUsers),
    canActivate: [adminGuard],
  },
  {
    path: 'game',
    loadComponent: () => import('./game/game').then(m => m.Game),
    canActivate: [playerGuard],
  },
  {
    path: 'game/:gameId',
    loadComponent: () => import('./game/player-view/player-view').then(m => m.PlayerView),
    canActivate: [playerGuard],
  },
  {
    path: 'backend-error',
    loadComponent: () => import('./backend-error/backend-error').then(m => m.BackendError),
  },
];
