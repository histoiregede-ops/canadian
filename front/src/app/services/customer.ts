import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map, timeout } from 'rxjs/operators';
import { environment } from '../../environments/environment';


export interface Customer {
  id?: string;
  fullName?: string;
  name?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  country?: string;
  points?: number;
  loyaltyLevel?: string;
  loyaltyPoints?: number;
  totalSpent?: number;
  orderCount?: number;
}

export interface LoyaltyData {
  points: number;
  level: string;
  nextLevelPoints: number;
  totalSpent: number;
  orderCount: number;
}

@Injectable({
  providedIn: 'root'
})
export class CustomerService {
  private apiUrl = `${environment.apiUrl}/api/customers`;

  constructor(private http: HttpClient) { }

  getCustomers(): Observable<Customer[]> {
    return this.http.get<any>(this.apiUrl).pipe(
      timeout(15000),
      map(response => response.data || response)
    );
  }

  createCustomer(customer: Customer): Observable<Customer> {
    return this.http.post<Customer>(this.apiUrl, customer).pipe(timeout(20000));
  }

  updateCustomer(id: string, customer: Customer): Observable<Customer> {
    return this.http.put<Customer>(`${this.apiUrl}/${id}`, customer).pipe(timeout(20000));
  }

  deleteCustomer(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`).pipe(timeout(15000));
  }

  getCustomerLoyalty(id: string): Observable<LoyaltyData> {
    return this.http.get<LoyaltyData>(`${this.apiUrl}/${id}/loyalty`).pipe(timeout(15000));
  }

  searchCustomers(q: string): Observable<Customer[]> {
    return this.http.get<Customer[]>(`${this.apiUrl}/search?q=${encodeURIComponent(q)}`).pipe(timeout(15000));
  }

  quickRegister(customerData: { name: string; email: string; phone?: string }): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/quick-register`, customerData).pipe(timeout(20000));
  }

  selfRegister(customerData: Omit<Customer, 'id' | 'createdAt' | 'points' | 'loyaltyLevel'>): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/register`, customerData).pipe(timeout(20000));
  }

  addLoyaltyPoints(customerId: string, points: number, reason: string): Observable<Customer> {
    return this.http.post<Customer>(`${this.apiUrl}/${customerId}/loyalty`, { points, reason }).pipe(timeout(15000));
  }
}
