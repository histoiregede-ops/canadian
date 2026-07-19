import { Injectable } from '@angular/core';
import { Resolve, ActivatedRouteSnapshot } from '@angular/router';
import { Observable, forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { FinanceService } from '../services/finance.service';
import { CustomerService } from '../services/customer';
import { AuthService } from '../services/auth';

export interface FinanceResolved {
  data: any;
  customers: any[];
}

@Injectable({ providedIn: 'root' })
export class FinanceResolver implements Resolve<FinanceResolved> {
  constructor(private financeService: FinanceService, private customerService: CustomerService, private authService: AuthService) {}

  resolve(route: ActivatedRouteSnapshot): Observable<FinanceResolved> {
    if (!this.authService.isLoggedIn()) {
      return of({ data: { data: [], summary: { revenue: 0, paid: 0, pending: 0 }, chartData: null }, customers: [] });
    }
    return forkJoin({
      data: this.financeService.getFinanceData().pipe(catchError(() => of({ data: [], summary: { revenue: 0, paid: 0, pending: 0 }, chartData: null }))),
      customers: this.customerService.getCustomers().pipe(catchError(() => of([])))
    });
  }
}
