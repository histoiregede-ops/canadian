import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';

const CUSTOMER_TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24 heures
const CUSTOMER_KEY = 'customer';
const CUSTOMER_TOKEN_KEY = 'customer_token';
const CUSTOMER_TOKEN_EXPIRY_KEY = 'customer_token_expiry';

export interface Customer {
  id?: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
  createdAt?: Date;
  points?: number;
  loyaltyLevel?: 'bronze' | 'silver' | 'gold' | 'platinum';
}

export interface AuthResponse {
  success: boolean;
  customer: Customer;
  token?: string;
  message?: string;
}

@Injectable({
  providedIn: 'root'
})
export class CustomerAuthService {
  private apiUrl = `${environment.apiUrl}/api/customers`;
  private currentCustomerSubject = new BehaviorSubject<Customer | null>(null);
  public currentCustomer$ = this.currentCustomerSubject.asObservable();

  constructor(private http: HttpClient) {
    const savedCustomer = localStorage.getItem(CUSTOMER_KEY);
    if (savedCustomer && this.getCustomerToken()) {
      this.currentCustomerSubject.next(JSON.parse(savedCustomer));
    }
  }

  // Register customer
  register(customerData: Omit<Customer, 'id' | 'createdAt' | 'points' | 'loyaltyLevel'>): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/register`, customerData)
      .pipe(
        tap(response => {
          if (response.success && response.customer && response.token) {
            this.setCurrentCustomer(response.customer);
            this.setCustomerToken(response.token);
          }
        })
      );
  }

  // Login customer
  login(email: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/login`, { email, password })
      .pipe(
        tap(response => {
          if (response.success && response.customer && response.token) {
            this.setCurrentCustomer(response.customer);
            this.setCustomerToken(response.token);
          }
        })
      );
  }

  // Quick registration during checkout (minimal data)
  quickRegister(customerData: { name: string; email: string; phone?: string }): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/quick-register`, customerData)
      .pipe(
        tap(response => {
          if (response.success && response.customer) {
            this.setCurrentCustomer(response.customer);
            if (response.token) {
              this.setCustomerToken(response.token);
            }
          }
        })
      );
  }

  // Update own profile (customer self)
  updateProfile(customerData: Partial<Customer>): Observable<Customer> {
    const token = this.getCustomerToken();
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    return this.http.put<Customer>(`${this.apiUrl}/profile/me`, customerData, { headers })
      .pipe(
        tap(updatedCustomer => {
          this.setCurrentCustomer(updatedCustomer);
        })
      );
  }

  // Get own profile (customer self)
  getOwnProfile(): Observable<Customer> {
    const token = this.getCustomerToken();
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    return this.http.get<Customer>(`${this.apiUrl}/profile/me`, { headers });
  }

  // Get customer by ID (admin)
  getCustomer(customerId: string): Observable<Customer> {
    return this.http.get<Customer>(`${this.apiUrl}/${customerId}`);
  }

  // Logout
  logout(): void {
    this.clearCustomerAuth();
  }

  // Get current customer
  getCurrentCustomer(): Customer | null {
    if (!this.getCustomerToken()) {
      this.clearCustomerAuth();
      return null;
    }
    return this.currentCustomerSubject.value;
  }

  // Check if customer is authenticated
  isAuthenticated(): boolean {
    return this.getCurrentCustomer() !== null;
  }

  // Set current customer
  setCurrentCustomer(customer: Customer): void {
    localStorage.setItem(CUSTOMER_KEY, JSON.stringify(customer));
    this.currentCustomerSubject.next(customer);
  }

  // Store customer JWT token for REST API calls
  private setCustomerToken(token: string): void {
    localStorage.setItem(CUSTOMER_TOKEN_KEY, token);
    localStorage.setItem(CUSTOMER_TOKEN_EXPIRY_KEY, String(Date.now() + CUSTOMER_TOKEN_TTL_MS));
  }

  // Get customer token
  getCustomerToken(): string | null {
    if (this.isCustomerTokenExpired()) {
      this.clearCustomerAuth();
      return null;
    }
    return localStorage.getItem(CUSTOMER_TOKEN_KEY);
  }

  private getCustomerTokenExpiry(): number | null {
    const expiry = localStorage.getItem(CUSTOMER_TOKEN_EXPIRY_KEY);
    return expiry ? Number(expiry) : null;
  }

  private isCustomerTokenExpired(): boolean {
    const expiry = this.getCustomerTokenExpiry();
    return expiry !== null && Date.now() >= expiry;
  }

  private clearCustomerAuth(): void {
    localStorage.removeItem(CUSTOMER_KEY);
    localStorage.removeItem(CUSTOMER_TOKEN_KEY);
    localStorage.removeItem(CUSTOMER_TOKEN_EXPIRY_KEY);
    this.currentCustomerSubject.next(null);
  }

  // Get customer orders (for dashboard)
  getCustomerOrders(customerId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/${customerId}/orders`);
  }

  // Get customer loyalty points
  getLoyaltyPoints(customerId: string): Observable<{ points: number; level: string; nextLevelPoints: number }> {
    return this.http.get<{ points: number; level: string; nextLevelPoints: number }>(`${this.apiUrl}/${customerId}/loyalty`);
  }

  // Add loyalty points
  addLoyaltyPoints(customerId: string, points: number, reason: string): Observable<Customer> {
    return this.http.post<Customer>(`${this.apiUrl}/${customerId}/loyalty`, { points, reason })
      .pipe(
        tap(updatedCustomer => {
          this.setCurrentCustomer(updatedCustomer);
        })
      );
  }
}
