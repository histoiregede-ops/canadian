import { Injectable } from '@angular/core';
import { Resolve, ActivatedRouteSnapshot } from '@angular/router';
import { Observable, forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { StatsService } from '../services/stats';
import { AuthService } from '../services/auth';

export interface DashboardResolved {
  stats: any;
  recentOrders: any[];
  urgentRepairs: any[];
}

@Injectable({ providedIn: 'root' })
export class DashboardResolver implements Resolve<DashboardResolved> {
  constructor(private statsService: StatsService, private authService: AuthService) {}

  resolve(route: ActivatedRouteSnapshot): Observable<DashboardResolved> {
    if (!this.authService.isLoggedIn()) {
      return of({ stats: null, recentOrders: [], urgentRepairs: [] });
    }
    return forkJoin({
      stats: this.statsService.getDashboardStats().pipe(catchError(() => of(null))),
      recentOrders: this.statsService.getRecentOrders().pipe(catchError(() => of([]))),
      urgentRepairs: this.statsService.getUrgentRepairs().pipe(catchError(() => of([])))
    });
  }
}
