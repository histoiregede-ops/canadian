import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Router } from '@angular/router';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(private router: Router) {}

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
          message: err.message
        });
        if (requestId && err.error && typeof err.error === 'object') {
          err.error.requestId = requestId;
        }
        if (err.status === 401) {
          localStorage.removeItem('token');
          localStorage.removeItem('customer_token');
          this.router.navigate(['/login']);
        }
        return throwError(() => err);
      })
    );
  }
}
