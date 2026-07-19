import { Injectable } from '@angular/core';
import { Resolve, ActivatedRouteSnapshot } from '@angular/router';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { UserService } from '../services/user.service';
import { AuthService } from '../services/auth';

export interface TechniciansResolved {
  technicians: any[];
}

@Injectable({ providedIn: 'root' })
export class TechniciansResolver implements Resolve<TechniciansResolved> {
  constructor(private userService: UserService, private authService: AuthService) {}

  resolve(route: ActivatedRouteSnapshot): Observable<TechniciansResolved> {
    if (!this.authService.isLoggedIn()) {
      return of({ technicians: [] });
    }
    return this.userService.getUsers().pipe(
      map(users => ({ technicians: users }))
    );
  }
}
