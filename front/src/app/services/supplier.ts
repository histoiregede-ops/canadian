import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface Supplier {
  id?: string;
  name: string;
  contactName?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
  productTypes?: string;
  isActive?: boolean;
  createdAt?: string;
}

@Injectable({ providedIn: 'root' })
export class SupplierService {
  private apiUrl = `${environment.apiUrl}/api/suppliers`;

  constructor(private http: HttpClient) {}

  getSuppliers(): Observable<Supplier[]> {
    return this.http.get<any>(this.apiUrl).pipe(
      map(response => response.data || response)
    );
  }

  getSupplier(id: string): Observable<Supplier> {
    return this.http.get<Supplier>(`${this.apiUrl}/${id}`);
  }

  createSupplier(supplier: Supplier): Observable<Supplier> {
    return this.http.post<Supplier>(this.apiUrl, supplier);
  }

  updateSupplier(id: string, supplier: Partial<Supplier>): Observable<Supplier> {
    return this.http.put<Supplier>(`${this.apiUrl}/${id}`, supplier);
  }

  deleteSupplier(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
