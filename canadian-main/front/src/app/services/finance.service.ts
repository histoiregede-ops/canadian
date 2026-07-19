import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Transaction {
    id?: string;
    date: string;
    description: string;
    type: 'income' | 'expense';
    amount: number;
    category?: string;
    status?: 'paid' | 'pending' | 'failed';
    customerId?: string;
    customerName?: string;
    comment?: string;
    time?: string;
}

export interface DailyReportDay {
    date: string;
    income: number;
    expense: number;
    balance: number;
    transactions: Transaction[];
}

export interface FluxJournalier {
    startDate: string | null;
    endDate: string | null;
    income: number;
    expense: number;
    balance: number;
    transactions: Transaction[];
}

@Injectable({
    providedIn: 'root'
})
export class FinanceService {
    private apiUrl = `${environment.apiUrl}/api/finance`;

    constructor(private http: HttpClient) { }

    getFinanceData(): Observable<any> {
        return this.http.get<any>(`${this.apiUrl}/transactions`);
    }

    createTransaction(transaction: Partial<Transaction>): Observable<Transaction> {
        return this.http.post<Transaction>(`${this.apiUrl}/transactions`, transaction);
    }

    getDailyReport(startDate?: string, endDate?: string): Observable<DailyReportDay[]> {
        let params = {};
        if (startDate) params = { ...params, startDate };
        if (endDate) params = { ...params, endDate };
        return this.http.get<DailyReportDay[]>(`${this.apiUrl}/daily-report`, { params });
    }

    getFluxJournalier(startDate: string, endDate: string): Observable<FluxJournalier> {
        return this.http.get<FluxJournalier>(`${this.apiUrl}/flux-journalier`, {
            params: { startDate, endDate }
        });
    }

    updateComment(id: string, comment: string): Observable<any> {
        return this.http.put(`${this.apiUrl}/transactions/${id}/comment`, { comment });
    }

    getTransaction(id: string): Observable<Transaction> {
        return this.http.get<Transaction>(`${this.apiUrl}/transactions/${id}`);
    }

    updateTransaction(id: string, data: Partial<Transaction>): Observable<Transaction> {
        return this.http.put<Transaction>(`${this.apiUrl}/transactions/${id}`, data);
    }

    deleteTransaction(id: string): Observable<any> {
        return this.http.delete(`${this.apiUrl}/transactions/${id}`);
    }

    getTransactionStats(): Observable<any> {
        return this.http.get<any>(`${this.apiUrl}/transactions/stats`);
    }
}