import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Transfer {
  id: string;
  operator: string;
  type: 'sent' | 'received';
  amount: number;
  fees: number;
  customerPhone?: string;
  agentId?: string;
  agentName?: string;
  reference?: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  note?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface TransferSummary {
  totalSent: number;
  totalReceived: number;
  totalFees: number;
  count: number;
  byOperator: Record<string, { sent: number; received: number; fees: number; count: number }>;
}

export interface TransferListResponse {
  data: Transfer[];
  total: number;
  page: number;
  pages: number;
}

@Injectable({ providedIn: 'root' })
export class TransferService {
  private apiUrl = `${environment.apiUrl}/api/transfers`;

  constructor(private http: HttpClient) {}

  getTransfers(filters: {
    page?: number;
    limit?: number;
    operator?: string;
    type?: string;
    status?: string;
    agentId?: string;
    from?: string;
    to?: string;
  }): Observable<TransferListResponse> {
    const params: Record<string, string | number> = { page: filters.page || 1, limit: filters.limit || 20 };
    if (filters.operator) params['operator'] = filters.operator;
    if (filters.type) params['type'] = filters.type;
    if (filters.status) params['status'] = filters.status;
    if (filters.agentId) params['agentId'] = filters.agentId;
    if (filters.from) params['from'] = filters.from;
    if (filters.to) params['to'] = filters.to;

    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => query.set(key, String(value)));

    return this.http.get<TransferListResponse>(`${this.apiUrl}?${query.toString()}`);
  }

  getDailySummary(agentId?: string): Observable<TransferSummary> {
    const url = agentId ? `${this.apiUrl}/summary/daily?agentId=${agentId}` : `${this.apiUrl}/summary/daily`;
    return this.http.get<TransferSummary>(url);
  }

  createTransfer(data: Partial<Transfer>): Observable<Transfer> {
    return this.http.post<Transfer>(this.apiUrl, data);
  }

  updateTransfer(id: string, data: Partial<Transfer>): Observable<Transfer> {
    return this.http.put<Transfer>(`${this.apiUrl}/${id}`, data);
  }

  deleteTransfer(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  confirmTransfer(id: string): Observable<Transfer> {
    return this.http.post<Transfer>(`${this.apiUrl}/${id}/confirm`, {});
  }

  failTransfer(id: string): Observable<Transfer> {
    return this.http.post<Transfer>(`${this.apiUrl}/${id}/fail`, {});
  }
}
