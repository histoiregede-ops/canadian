import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';


export interface OrderItemData {
  productId: string;
  quantity: number;
  unitPrice: number;
}

export interface OrderData {
  items: OrderItemData[];
  customerId?: string;
  customer?: any;
  paymentMethod: string;
  discount: number;
  tax: number;
  subtotal: number;
  totalAmount: number;
  paidAmount: number;
  deliveryAddress?: string;
  status?: string;
  installationId?: string;
}

@Injectable({
  providedIn: 'root'
})
export class OrderService {
  private apiUrl = `${environment.apiUrl}/api/orders`;

  constructor(private http: HttpClient) { }

  getOrders(): Observable<any[]> {
    return this.http.get<any>(this.apiUrl).pipe(
      map(response => response.data || response)
    );
  }

  createOrder(order: OrderData): Observable<any> {
    return this.http.post<any>(this.apiUrl, order);
  }

  updateOrder(orderId: string, updateData: Partial<OrderData>): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${orderId}`, updateData);
  }

  deleteOrder(orderId: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${orderId}`);
  }
}
