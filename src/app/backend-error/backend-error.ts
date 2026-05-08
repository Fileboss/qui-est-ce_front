import { Component } from '@angular/core';

@Component({
  selector: 'app-backend-error',
  templateUrl: './backend-error.html',
})
export class BackendError {
  retry(): void {
    window.location.reload();
  }
}
