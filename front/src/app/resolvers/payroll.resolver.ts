import { Injectable } from '@angular/core';
import { Resolve, ActivatedRouteSnapshot } from '@angular/router';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { UserService, User } from '../services/user.service';
import { AuthService } from '../services/auth';

export interface PayrollResolved {
  staff: User[];
}

@Injectable({ providedIn: 'root' })
export class PayrollResolver implements Resolve<PayrollResolved> {
  constructor(private userService: UserService, private authService: AuthService) {}

  resolve(route: ActivatedRouteSnapshot): Observable<PayrollResolved> {
    if (!this.authService.isLoggedIn()) {
      return of({ staff: [] });
    }

    return this.userService.getUsers().pipe(
      map(users => ({ staff: users.filter(u => ['technician', 'cashier'].includes(u.role)) })),
      catchError(() => of({ staff: [] }))
    );
  }
}
