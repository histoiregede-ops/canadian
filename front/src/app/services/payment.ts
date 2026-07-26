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
  customerName?: string;
  customerEmail?: string;
}

export interface InitiatePaymentResponse {
  success: boolean;
  paymentId: string;
  transactionId: string;
  paymentUrl: string;
  token: string;
  status: string;
  message: string;
}

export interface PaymentStatusResponse {
  success: boolean;
  status: string;
  isCompleted: boolean;
  isFailed: boolean;
  isPending: boolean;
  amount?: number;
  currency?: string;
  transactionId?: string;
  paymentMethod?: string;
  phoneNumber?: string;
  message?: string;
}

@Injectable({
  providedIn: 'root'
})
export class PaymentService {
  private apiUrl = `${environment.apiUrl}/api/payments`;

  constructor(private http: HttpClient) { }

  /** Traiter un paiement (cash ou legacy) */
  processPayment(payment: Payment): Observable<Payment> {
    return this.http.post<Payment>(`${this.apiUrl}`, payment);
  }

  /** Récupérer un paiement par ID */
  getPayment(id: string): Observable<Payment> {
    return this.http.get<Payment>(`${this.apiUrl}/${id}`);
  }

  /** Récupérer les paiements d'une commande */
  getOrderPayments(orderId: string): Observable<Payment[]> {
    return this.http.get<Payment[]>(`${this.apiUrl}/order/${orderId}`);
  }

  /** Rembourser un paiement (admin) */
  refundPayment(paymentId: string, amount?: number): Observable<Payment> {
    return this.http.post<Payment>(`${this.apiUrl}/${paymentId}/refund`, { amount });
  }

  /** Initier un paiement mobile money via CinetPay */
  initiatePayment(data: InitiatePaymentRequest): Observable<InitiatePaymentResponse> {
    return this.http.post<InitiatePaymentResponse>(`${this.apiUrl}/initiate`, data);
  }

  /** Vérifier le statut d'une transaction CinetPay */
  checkPaymentStatus(transactionId: string): Observable<PaymentStatusResponse> {
    return this.http.get<PaymentStatusResponse>(`${this.apiUrl}/status/${transactionId}`);
  }

  /** Vérifier un paiement mobile money */
  verifyMobileMoneyPayment(transactionId: string, phoneNumber: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/verify-mobile-money`, { transactionId, phoneNumber });
  }
}
