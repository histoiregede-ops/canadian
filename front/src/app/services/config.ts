import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, shareReplay } from 'rxjs';
import { environment } from '../../environments/environment';

export interface PaymentMethod {
  key: string;
  name: string;
  icon: string;
  operator: string;
  isMobileMoney: boolean;
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
  private config$: Observable<AppConfig> | null = null;

  constructor(private http: HttpClient) {}

  getPaymentMethods(): Observable<AppConfig> {
    if (!this.config$) {
      this.config$ = this.http.get<AppConfig>(`${this.apiUrl}/payment-methods`).pipe(shareReplay(1));
    }
    return this.config$;
  }
}
