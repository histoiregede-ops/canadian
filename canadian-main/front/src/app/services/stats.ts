import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
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
  Installations?: { id: string; status: string; location: string }[];
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

  constructor(private http: HttpClient) { }

  getDashboardStats(): Observable<DashboardStats> {
    return this.http.get<DashboardStats>(`${this.apiUrl}/dashboard`);
  }

  getRecentOrders(): Observable<RecentOrder[]> {
    return this.http.get<RecentOrder[]>(`${this.apiUrl}/dashboard/recent-orders`);
  }

  getUrgentRepairs(): Observable<UrgentRepair[]> {
    return this.http.get<UrgentRepair[]>(`${this.apiUrl}/dashboard/urgent-repairs`);
  }
}
