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
    if (token) {
      const cloned = req.clone({
        setHeaders: { Authorization: `Bearer ${token}` }
      });
      return next.handle(cloned).pipe(
        catchError(err => {
          if (err.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('customer_token');
            this.router.navigate(['/login']);
          }
          return throwError(() => err);
        })
      );
    }
    return next.handle(req);
  }
}
