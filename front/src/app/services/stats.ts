import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, tap } from 'rxjs';
import { environment } from '../../environments/environment';


export interface DashboardStats {
  dailyIncome: number;
  dailyExpense: number;
  dailyOrders: number;
  activeRepairs: number;
  plannedInstallations: number;
  lowStockProducts: number;
}

export interface RecentOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  productName: string;
  totalAmount: number;
  status: string;
  createdAt: string;
}

export interface UrgentRepair {
  id: string;
  deviceType: string;
  brand?: string;
  reportedIssue: string;
  status: string;
  priority?: string;
  customerName: string;
  receivedAt?: string;
  estimatedCost?: number;
}

@Injectable({
  providedIn: 'root'
})
export class StatsService {
  private apiUrl = `${environment.apiUrl}/api/stats`;
  private cache: DashboardStats | null = null;
  private cacheTime: number = 0;
  private readonly CACHE_DURATION = 30000;

  constructor(private http: HttpClient) { }

  getDashboardStats(): Observable<DashboardStats> {
    const now = Date.now();
    if (this.cache && (now - this.cacheTime < this.CACHE_DURATION)) {
      return of(this.cache);
    }

    return this.http.get<DashboardStats>(`${this.apiUrl}/dashboard`).pipe(
      tap(data => {
        this.cache = data;
        this.cacheTime = Date.now();
      })
    );
  }

  getRecentOrders(): Observable<RecentOrder[]> {
    return this.http.get<RecentOrder[]>(`${this.apiUrl}/dashboard/recent-orders`);
  }

  getUrgentRepairs(): Observable<UrgentRepair[]> {
    return this.http.get<UrgentRepair[]>(`${this.apiUrl}/dashboard/urgent-repairs`);
  }
}
