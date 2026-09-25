import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { Router } from '@angular/router';
import { ErrorModalService } from './error-modal.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(private router: Router, private errorModal: ErrorModalService) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Staff token takes priority
    let token = localStorage.getItem('token');
    // Fall back to customer token if no staff token
    if (!token) {
      token = localStorage.getItem('customer_token');
    }
    const request = token
      ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
      : req;
    const startTime = Date.now();
    return next.handle(request).pipe(
      catchError(err => {
        const requestId = err.headers?.get('X-Request-ID') || err.error?.requestId;
        console.error('[HTTP] Requête API échouée', {
          method: req.method,
          url: req.urlWithParams,
          status: err.status,
          statusText: err.statusText,
          requestId,
          error: err.error,
          message: err.message,
          durationMs: Date.now() - startTime
        });
        if (requestId && err.error && typeof err.error === 'object') {
          err.error.requestId = requestId;
        }
        // Gestion globale des erreurs via modal redesignée
        // 400, 422, 409 -> toast (validation) — pas de modal
        // 401 -> redirection login (géré ci-dessous)
        // 0, 403, 404, 429, 500+ -> modal globale
        const shouldShowModal = 
          err.status === 0 || 
          err.status === 403 || 
          err.status === 429 || 
          err.status >= 500;

        if (shouldShowModal) {
          // Délai pour laisser le toast éventuel s'afficher d'abord si besoin
          setTimeout(() => this.errorModal.showFromHttpError(err, `${req.method} ${req.urlWithParams}`), 100);
        }

        if (err.status === 401) {
          localStorage.removeItem('token');
          localStorage.removeItem('customer_token');
          // Ne pas afficher de modal pour 401, juste redirection
          // Mais si c'est un 401 sur une route autre que /login, on pourrait informer
          const isLoginRequest = req.url.includes('/auth/login') || req.url.includes('/customers/login');
          if (!isLoginRequest) {
            this.errorModal.show({
              title: 'Session expirée',
              message: 'Votre session a expiré. Veuillez vous reconnecter.',
              severity: 'auth',
              code: 401,
              requestId
            });
          }
          this.router.navigate(['/login']);
        }
        return throwError(() => err);
      }),
      tap(() => {
        // Log successful request duration
        console.log(`[PERF-FRONTEND] ${req.method} ${req.urlWithParams} — ${(Date.now() - startTime)}ms`);
      })
    );
  }
}
