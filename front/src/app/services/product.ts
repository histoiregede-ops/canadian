import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, tap } from 'rxjs';
import { environment } from '../../environments/environment';


export interface StockMovement {
  id: number;
  productId: string;
  previousQuantity: number;
  newQuantity: number;
  changeAmount: number;
  reason: string;
  reference: string | null;
  createdBy: string | null;
  createdAt: string;
}

export interface Product {
  id?: string;
  name: string;
  photo?: string;
  description?: string;
  price: number;
  stockQuantity: number;
  lowStockThreshold?: number;
  status: string;
  categoryId?: string;
  Category?: any;
}

@Injectable({
  providedIn: 'root'
})
export class ProductService {
  private apiUrl = `${environment.apiUrl}/api/products`;
  private productsCache: Product[] | null = null;
  private cacheTime: number = 0;
  private readonly CACHE_DURATION = 60000; // 1 minute

  constructor(private http: HttpClient) { }

  getProducts(): Observable<Product[]> {
    const now = Date.now();
    if (this.productsCache && (now - this.cacheTime < this.CACHE_DURATION)) {
      return of(this.productsCache);
    }

    return this.http.get<Product[]>(this.apiUrl).pipe(
      tap(data => {
        this.productsCache = data;
        this.cacheTime = Date.now();
      })
    );
  }

  getProduct(id: string): Observable<Product> {
    return this.http.get<Product>(`${this.apiUrl}/${id}`);
  }

  createProduct(product: Product): Observable<Product> {
    return this.http.post<Product>(this.apiUrl, product).pipe(
      tap(() => this.productsCache = null) // Invalidate cache
    );
  }

  updateProduct(id: string, product: Product): Observable<Product> {
    return this.http.put<Product>(`${this.apiUrl}/${id}`, product).pipe(
      tap(() => this.productsCache = null)
    );
  }

  deleteProduct(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(
      tap(() => this.productsCache = null)
    );
  }

  restockProduct(id: string, quantity: number): Observable<Product> {
    return this.http.post<Product>(`${this.apiUrl}/${id}/restock`, { quantity }).pipe(
      tap(() => this.productsCache = null)
    );
  }

  getMovements(id: string): Observable<StockMovement[]> {
    return this.http.get<StockMovement[]>(`${this.apiUrl}/${id}/movements`);
  }
}
