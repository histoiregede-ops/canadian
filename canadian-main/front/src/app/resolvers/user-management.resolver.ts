import { Injectable } from '@angular/core';
import { Resolve, ActivatedRouteSnapshot } from '@angular/router';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { UserService } from '../services/user.service';
import { AuthService } from '../services/auth';

export interface UserManagementResolved {
  users: any[];
}

@Injectable({ providedIn: 'root' })
export class UserManagementResolver implements Resolve<UserManagementResolved> {
  constructor(private userService: UserService, private authService: AuthService) {}

  resolve(route: ActivatedRouteSnapshot): Observable<UserManagementResolved> {
    if (!this.authService.isLoggedIn()) {
      return of({ users: [] });
    }
    return this.userService.getUsers().pipe(
      map(users => ({ users }))
    );
  }
}
