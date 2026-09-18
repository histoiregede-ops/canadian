import { Injectable } from '@angular/core';
import { Resolve, ActivatedRouteSnapshot } from '@angular/router';
import { Observable, forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { StatsService, DashboardStats } from '../services/stats';
import { AuthService } from '../services/auth';

export interface DashboardResolved {
  stats: DashboardStats;
  recentOrders: any[];
  urgentRepairs: any[];
}

const DEFAULT_STATS: DashboardStats = {
  dailyIncome: 0,
  dailyExpense: 0,
  dailyOrders: 0,
  activeRepairs: 0,
  plannedInstallations: 0,
  lowStockProducts: 0
};

@Injectable({ providedIn: 'root' })
export class DashboardResolver implements Resolve<DashboardResolved> {
  constructor(private statsService: StatsService, private authService: AuthService) {}

  resolve(route: ActivatedRouteSnapshot): Observable<DashboardResolved> {
    if (!this.authService.isLoggedIn()) {
      return of({ stats: DEFAULT_STATS, recentOrders: [], urgentRepairs: [] });
    }
    return forkJoin({
      stats: this.statsService.getDashboardStats().pipe(catchError(error => {
        console.error('[DashboardResolver] Chargement des statistiques échoué:', error);
        return of(DEFAULT_STATS);
      })),
      recentOrders: this.statsService.getRecentOrders().pipe(catchError(error => {
        console.error('[DashboardResolver] Chargement des commandes échoué:', error);
        return of([]);
      })),
      urgentRepairs: this.statsService.getUrgentRepairs().pipe(catchError(error => {
        console.error('[DashboardResolver] Chargement des réparations urgentes échoué:', error);
        return of([]);
      }))
    });
  }
}
