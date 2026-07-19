import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface PaymentMethod {
  key: string;
  name: string;
  icon: string;
  operator: string;
  isMobileMoney: boolean;
}

export interface ExpenseCategory {
  key: string;
  name: string;
  icon: string;
}

export interface AppConfig {
  methods: PaymentMethod[];
  whatsapp: string;
  currency: string;
  taxRate: number;
}

@Injectable({ providedIn: 'root' })
export class ConfigService {
  private apiUrl = `${environment.apiUrl}/api/config`;

  constructor(private http: HttpClient) {}

  getPaymentMethods(): Observable<AppConfig> {
    return this.http.get<AppConfig>(`${this.apiUrl}/payment-methods`);
  }

  getExpenseCategories(): Observable<ExpenseCategory[]> {
    return this.http.get<ExpenseCategory[]>(`${this.apiUrl}/expense-categories`);
  }
}
