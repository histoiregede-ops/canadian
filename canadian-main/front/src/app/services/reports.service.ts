import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface TopProduct {
  productId: string;
  name: string;
  photo: string | null;
  price: number;
  totalSold: number;
  totalRevenue: number;
}

export interface TechnicianPerf {
  technicianId: string;
  fullName: string;
  totalInstallations: number;
  totalRevenue: number;
}

export interface RevenueMonth {
  month: string;
  revenue: number;
  orderCount: number;
}

export interface CategoryDist {
  categoryId: string;
  name: string;
  count: number;
}

export interface ReportsData {
  monthlyRevenue: number;
  topProducts: TopProduct[];
  technicianPerformance: TechnicianPerf[];
  revenueEvolution: RevenueMonth[];
  categoryDistribution: CategoryDist[];
}

@Injectable({ providedIn: 'root' })
export class ReportsService {
  private apiUrl = `${environment.apiUrl}/api/reports`;

  constructor(private http: HttpClient) {}

  getDashboard(): Observable<ReportsData> {
    return this.http.get<ReportsData>(`${this.apiUrl}/dashboard`);
  }
}
