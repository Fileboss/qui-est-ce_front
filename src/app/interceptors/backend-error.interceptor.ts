import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

export const backendErrorInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith('/api')) return next(req);

  const router = inject(Router);
  return next(req).pipe(
    catchError((err: HttpErrorResponse) => {
      if ((err.status === 0 || err.status >= 500) && router.url !== '/backend-error') {
        router.navigate(['/backend-error']);
      }
      return throwError(() => err);
    }),
  );
};
