import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface PurchaseOrderItem {
  productName: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  receivedQuantity: number;
}

export interface PurchaseOrder {
  id?: string;
  orderNumber: string;
  supplierId: number;
  status: 'pending' | 'confirmed' | 'partial' | 'received' | 'cancelled';
  orderDate?: string;
  expectedDate?: string;
  receivedDate?: string;
  totalAmount: number;
  notes?: string;
  items: PurchaseOrderItem[];
  lastReminderSent?: string;
  Supplier?: { id: number; name: string; phone?: string; contactName?: string; email?: string };
  createdAt?: string;
}

@Injectable({ providedIn: 'root' })
export class PurchaseOrderService {
  private apiUrl = `${environment.apiUrl}/api/purchase-orders`;

  constructor(private http: HttpClient) {}

  getOrders(): Observable<PurchaseOrder[]> {
    return this.http.get<any>(this.apiUrl).pipe(
      map(response => response.data || response)
    );
  }

  getOverdue(): Observable<PurchaseOrder[]> {
    return this.http.get<PurchaseOrder[]>(`${this.apiUrl}/overdue`);
  }

  getOrder(id: string): Observable<PurchaseOrder> {
    return this.http.get<PurchaseOrder>(`${this.apiUrl}/${id}`);
  }

  createOrder(order: Partial<PurchaseOrder>): Observable<PurchaseOrder> {
    return this.http.post<PurchaseOrder>(this.apiUrl, order);
  }

  updateOrder(id: string, order: Partial<PurchaseOrder>): Observable<PurchaseOrder> {
    return this.http.put<PurchaseOrder>(`${this.apiUrl}/${id}`, order);
  }

  receiveOrder(id: string, items: PurchaseOrderItem[]): Observable<PurchaseOrder> {
    return this.http.post<PurchaseOrder>(`${this.apiUrl}/${id}/receive`, { items });
  }

  sendReminder(id: string): Observable<{ message: string; order: PurchaseOrder; supplier: any; whatsappLink: string | null }> {
    return this.http.post<any>(`${this.apiUrl}/${id}/remind`, {});
  }

  deleteOrder(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }
}
