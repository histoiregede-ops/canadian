import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of, forkJoin } from 'rxjs';
import { map, timeout, mergeMap, catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pages: number;
}

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
  barcode?: string;
  supplierId?: number;
  supplierName?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ProductService {
  private apiUrl = `${environment.apiUrl}/api/products`;

  constructor(private http: HttpClient) { }

  getProducts(): Observable<Product[]> {
    return this.loadAllProducts().pipe(
      timeout(30000),
      map(products => products || [])
    );
  }

  getProductsPaginated(page: number = 1, limit: number = 20): Observable<PaginatedResult<Product>> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());
    return this.http.get<any>(this.apiUrl, { params }).pipe(
      timeout(10000),
      map(response => ({
        data: response.data || [],
        total: response.total || 0,
        page: response.page || page,
        pages: response.pages || 1
      }))
    );
  }

  private loadAllProducts(): Observable<Product[]> {
    const firstParams = new HttpParams().set('limit', '100').set('page', '1');
    return this.http.get<any>(this.apiUrl, { params: firstParams }).pipe(
      timeout(10000),
      mergeMap((firstPage: any) => {
        const data: Product[] = firstPage.data || [];
        const total = firstPage.total || data.length;
        const pages = firstPage.pages || 1;

        if (pages <= 1) {
          return of(data);
        }

        const pageRequests: Observable<any>[] = [];
        for (let p = 2; p <= pages; p++) {
          const pageParams = new HttpParams().set('limit', '100').set('page', p.toString());
          pageRequests.push(
            this.http.get<any>(this.apiUrl, { params: pageParams }).pipe(
              timeout(10000),
              catchError(() => of({ data: [] }))
            )
          );
        }

        if (pageRequests.length === 0) {
          return of(data);
        }

        return forkJoin(pageRequests).pipe(
          map((remainingPages: any[]) => {
            const allData = [...data];
            for (const pageData of remainingPages) {
              allData.push(...(pageData.data || []));
            }
            return allData;
          })
        );
      })
    );
  }

  getProduct(id: string): Observable<Product> {
    return this.http.get<Product>(`${this.apiUrl}/${id}`);
  }

  createProduct(formData: FormData): Observable<Product> {
    return this.http.post<Product>(this.apiUrl, formData).pipe(timeout(10000));
  }

  updateProduct(id: string, formData: FormData): Observable<Product> {
    return this.http.put<any>(`${this.apiUrl}/${id}`, formData).pipe(
      timeout(10000),
      map(response => response.data || response)
    );
  }

  deleteProduct(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(timeout(10000));
  }

  restockProduct(id: string, quantity: number): Observable<Product> {
    return this.http.post<Product>(`${this.apiUrl}/${id}/restock`, { quantity });
  }

  getMovements(id: string): Observable<StockMovement[]> {
    return this.http.get<StockMovement[]>(`${this.apiUrl}/${id}/movements`);
  }

  adjustStock(id: string, quantity: number, reason?: string): Observable<Product> {
    return this.http.post<Product>(`${this.apiUrl}/${id}/adjust-stock`, { quantity, reason });
  }
}
