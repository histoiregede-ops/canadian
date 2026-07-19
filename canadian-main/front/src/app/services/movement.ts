import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface StockMovement {
  id: number;
  productId: string;
  previousQuantity: number;
  newQuantity: number;
  changeAmount: number;
  reason: string;
  reference: string | null;
  createdBy: string | null;
  createdAt: string;
  Product?: {
    id: string;
    name: string;
    price: number;
    Category?: { name: string };
  };
}

export interface MovementsFilters {
  productId?: string;
  reason?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export interface MovementsResponse {
  movements: StockMovement[];
  total: number;
  page: number;
  pages: number;
}

export interface MovementSummary {
  total: number;
  byReason: { reason: string; count: number }[];
  byProduct: { productId: string; productName: string; count: number }[];
  dateRange: { start: string; end: string };
}

@Injectable({
  providedIn: 'root'
})
export class MovementService {
  private apiUrl = `${environment.apiUrl}/api/movements`;

  constructor(private http: HttpClient) {}

  getMovements(filters?: MovementsFilters): Observable<MovementsResponse> {
    let params: any = {};
    if (filters) {
      Object.keys(filters).forEach(key => {
        if (filters[key as keyof MovementsFilters] !== undefined && filters[key as keyof MovementsFilters] !== null && filters[key as keyof MovementsFilters] !== '') {
          params[key] = filters[key as keyof MovementsFilters];
        }
      });
    }
    return this.http.get<MovementsResponse>(this.apiUrl, { params });
  }

  getMovement(id: number): Observable<StockMovement> {
    return this.http.get<StockMovement>(`${this.apiUrl}/${id}`);
  }

  getMovementsByProduct(productId: string, page = 1, limit = 50): Observable<MovementsResponse> {
    return this.http.get<MovementsResponse>(`${this.apiUrl}/product/${productId}`, {
      params: { page: page.toString(), limit: limit.toString() }
    });
  }

  getMovementsSummary(filters?: MovementsFilters): Observable<MovementSummary> {
    let params: any = {};
    if (filters) {
      Object.keys(filters).forEach(key => {
        if (filters[key as keyof MovementsFilters] !== undefined && filters[key as keyof MovementsFilters] !== null && filters[key as keyof MovementsFilters] !== '') {
          params[key] = filters[key as keyof MovementsFilters];
        }
      });
    }
    return this.http.get<MovementSummary>(`${this.apiUrl}/summary`, { params });
  }

  getReasons(): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}/reasons`);
  }
}
