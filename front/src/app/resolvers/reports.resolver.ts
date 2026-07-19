import { Injectable } from '@angular/core';
import { Resolve, ActivatedRouteSnapshot } from '@angular/router';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { ReportsService } from '../services/reports.service';
import { AuthService } from '../services/auth';

export interface ReportsResolved {
  data: any;
}

@Injectable({ providedIn: 'root' })
export class ReportsResolver implements Resolve<ReportsResolved> {
  constructor(private reportsService: ReportsService, private authService: AuthService) {}

  resolve(route: ActivatedRouteSnapshot): Observable<ReportsResolved> {
    if (!this.authService.isLoggedIn()) {
      return of({ data: null });
    }
    return this.reportsService.getDashboard().pipe(
      map(data => ({ data }))
    );
  }
}
