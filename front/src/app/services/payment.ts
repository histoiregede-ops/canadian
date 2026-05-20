import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';


export type PaymentMethod = 'cash' | 'orange_money' | 'moov_money' | 'wave' | 'bank_transfer' | 'card';

export interface Payment {
  id?: string;
  orderId: string;
  amount: number;
  currency?: string;
  paymentMethod: PaymentMethod;
  paymentIntentId?: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  transactionId?: string;
  paymentDate?: Date;
  notes?: string;
}

export interface InitiatePaymentRequest {
  orderId?: string;
  amount: number;
  paymentMethod: PaymentMethod;
  phoneNumber: string;
  customerId?: string;
}

export interface InitiatePaymentResponse {
  success: boolean;
  paymentId: string;
  depositId: string;
  status: string;
  message: string;
}

@Injectable({
  providedIn: 'root'
})
export class PaymentService {
  private apiUrl = `${environment.apiUrl}/api/payments`;

  constructor(private http: HttpClient) { }

  // Process payment
  processPayment(payment: Payment): Observable<Payment> {
    return this.http.post<Payment>(`${this.apiUrl}`, payment);
  }

  // Get payment by ID
  getPayment(id: string): Observable<Payment> {
    return this.http.get<Payment>(`${this.apiUrl}/${id}`);
  }

  // Get payments for order
  getOrderPayments(orderId: string): Observable<Payment[]> {
    return this.http.get<Payment[]>(`${this.apiUrl}/order/${orderId}`);
  }

  // Refund payment
  refundPayment(paymentId: string, amount?: number): Observable<Payment> {
    return this.http.post<Payment>(`${this.apiUrl}/${paymentId}/refund`, { amount });
  }

  // Initiate mobile money payment via PawaPay
  initiatePayment(data: InitiatePaymentRequest): Observable<InitiatePaymentResponse> {
    return this.http.post<InitiatePaymentResponse>(`${this.apiUrl}/initiate`, data);
  }

  // Check payment status
  checkPaymentStatus(depositId: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/status/${depositId}`);
  }

  // Verify payment with mobile money provider
  verifyMobileMoneyPayment(transactionId: string, phoneNumber: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/verify-mobile-money`, { transactionId, phoneNumber });
  }
}
