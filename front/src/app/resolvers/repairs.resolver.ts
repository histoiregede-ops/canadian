import { Injectable } from '@angular/core';
import { Resolve, ActivatedRouteSnapshot } from '@angular/router';
import { Observable, forkJoin, of } from 'rxjs';
import { RepairService } from '../services/repair';
import { CustomerService } from '../services/customer';
import { AuthService } from '../services/auth';

export interface RepairsResolved {
  repairs: any[];
  customers: any[];
}

@Injectable({ providedIn: 'root' })
export class RepairsResolver implements Resolve<RepairsResolved> {
  constructor(private repairService: RepairService, private customerService: CustomerService, private authService: AuthService) {}

  resolve(route: ActivatedRouteSnapshot): Observable<RepairsResolved> {
    if (!this.authService.isLoggedIn()) {
      return of({ repairs: [], customers: [] });
    }
    return forkJoin({
      repairs: this.repairService.getRepairs(),
      customers: this.customerService.getCustomers()
    });
  }
}
