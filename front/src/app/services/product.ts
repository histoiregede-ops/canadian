import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of, timer } from 'rxjs';
import { map, timeout, catchError, shareReplay, tap } from 'rxjs/operators';
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
  // Cache front 30s + déduplication via shareReplay => divise par ~10 le nb de requêtes (vu kilo.txt: 38 appels en 75s)
  private productsCache$ : Observable<Product[]> | null = null;
  private productsCacheExpiry = 0;
  private readonly PRODUCTS_TTL = 30000;

  constructor(private http: HttpClient) { }

  private invalidateProductsCache(): void {
    this.productsCache$ = null;
    this.productsCacheExpiry = 0;
  }

  getProducts(): Observable<Product[]> {
    // Charge TOUS les produits (400+) en paginant automatiquement (limit 100/page, séquentiel anti-burst)
    // Utilisé par inventory/admin pour voir tout le catalogue malgré la limite 100
    const now = Date.now();
    if (this.productsCache$ && now < this.productsCacheExpiry) {
      return this.productsCache$;
    }
    this.productsCacheExpiry = now + this.PRODUCTS_TTL;
    this.productsCache$ = this.loadAllProducts().pipe(
      timeout(60000),
      shareReplay(1),
      catchError(err => {
        this.invalidateProductsCache();
        console.error('[ProductService] getProducts (loadAll) failed', err);
        return of([]);
      })
    );
    timer(this.PRODUCTS_TTL).subscribe(() => this.invalidateProductsCache());
    return this.productsCache$;
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
    // Le backend supporte limit jusqu'à 500 : un seul appel pour ~400 produits au lieu de N pages avec délais de 500ms.
    // Réduit le temps de chargement de ~5-10s à <1s pour le catalogue complet.
    return this.tryLoadWithLimit(500).pipe(
      catchError(() => this.tryLoadWithLimit(20))
    );
  }

  private tryLoadWithLimit(limit: number): Observable<Product[]> {
    const params = new HttpParams().set('limit', limit.toString()).set('page', '1');
    return this.http.get<any>(this.apiUrl, { params }).pipe(
      timeout(15000),
      catchError((err: any) => {
        if (err?.status === 429 && limit === 500) {
          // Fallback sur 429 : réessaie avec limit=20
          console.warn('[ProductService] 429 détecté, fallback limit=20');
          return this.tryLoadWithLimit(20);
        }
        console.error('[ProductService] Erreur chargement produits:', err);
        return of([]);
      }),
      map((response: any) => response.data || [])
    );
  }

  getProduct(id: string): Observable<Product> {
    return this.http.get<Product>(`${this.apiUrl}/${id}`);
  }

  createProduct(formData: FormData): Observable<Product> {
    return this.http.post<Product>(this.apiUrl, formData).pipe(
      timeout(15000),
      tap(() => this.invalidateProductsCache())
    );
  }

  updateProduct(id: string, formData: FormData): Observable<Product> {
    return this.http.put<any>(`${this.apiUrl}/${id}`, formData).pipe(
      timeout(15000),
      map(response => response.data || response),
      tap(() => this.invalidateProductsCache())
    );
  }

  deleteProduct(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(
      timeout(10000),
      tap(() => this.invalidateProductsCache())
    );
  }

  restockProduct(id: string, quantity: number): Observable<Product> {
    return this.http.post<Product>(`${this.apiUrl}/${id}/restock`, { quantity }).pipe(
      tap(() => this.invalidateProductsCache())
    );
  }

  getMovements(id: string): Observable<StockMovement[]> {
    return this.http.get<StockMovement[]>(`${this.apiUrl}/${id}/movements`);
  }

  adjustStock(id: string, quantity: number, reason?: string): Observable<Product> {
    return this.http.post<Product>(`${this.apiUrl}/${id}/adjust-stock`, { quantity, reason }).pipe(
      tap(() => this.invalidateProductsCache())
    );
  }
}
