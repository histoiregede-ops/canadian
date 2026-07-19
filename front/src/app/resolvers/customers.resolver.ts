import { Injectable } from '@angular/core';
import { Resolve, ActivatedRouteSnapshot } from '@angular/router';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { CustomerService } from '../services/customer';
import { AuthService } from '../services/auth';

export interface CustomersResolved {
  customers: any[];
}

@Injectable({ providedIn: 'root' })
export class CustomersResolver implements Resolve<CustomersResolved> {
  constructor(private customerService: CustomerService, private authService: AuthService) {}

  resolve(route: ActivatedRouteSnapshot): Observable<CustomersResolved> {
    if (!this.authService.isLoggedIn()) {
      return of({ customers: [] });
    }
    return this.customerService.getCustomers().pipe(
      map(customers => ({ customers }))
    );
  }
}
