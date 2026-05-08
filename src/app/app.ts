import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthService } from './services/auth.service';
import { BackendError } from './backend-error/backend-error';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, BackendError],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected readonly auth = inject(AuthService);
}
