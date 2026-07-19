import { Injectable } from '@angular/core';
import { Resolve, ActivatedRouteSnapshot } from '@angular/router';
import { Observable, forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { InstallationService } from '../services/installation';
import { CustomerService } from '../services/customer';
import { UserService } from '../services/user.service';
import { OrderService } from '../services/order';
import { AuthService } from '../services/auth';

export interface InstallationsResolved {
  installations: any[];
  customers: any[];
  technicians: any[];
  orders: any[];
}

@Injectable({ providedIn: 'root' })
export class InstallationsResolver implements Resolve<InstallationsResolved> {
  constructor(private installationService: InstallationService, private customerService: CustomerService, private userService: UserService, private orderService: OrderService, private authService: AuthService) {}

  resolve(route: ActivatedRouteSnapshot): Observable<InstallationsResolved> {
    if (!this.authService.isLoggedIn()) {
      return of({ installations: [], customers: [], technicians: [], orders: [] });
    }
    return forkJoin({
      installations: this.installationService.getInstallations().pipe(catchError(() => of([]))),
      customers: this.customerService.getCustomers().pipe(catchError(() => of([]))),
      technicians: this.userService.getUsers().pipe(catchError(() => of([]))),
      orders: this.orderService.getOrders().pipe(catchError(() => of([])))
    });
  }
}
