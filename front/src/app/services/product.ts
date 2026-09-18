import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of, timer } from 'rxjs';
import { map, timeout, mergeMap, catchError, concatMap } from 'rxjs/operators';
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
    // Stratégie anti-burst : pas de forkJoin parallèle.
    // 1) Tentative avec limit=100 en séquentiel.
    // 2) Si 429 : retry une fois avec limit=20 (beaucoup moins gourmand).
    // 3) Si 100 réussit, on charge les pages restantes SÉQUENTIELLEMENT avec délai
    //    (pas de forkJoin) pour éviter un nouveau burst.
    // 4) Chaque page a son propre catchError : un échec partiel ne tue pas tout le chargement.
    return this.tryLoadWithLimit(100).pipe(
      catchError(() => this.tryLoadWithLimit(20))
    );
  }

  private tryLoadWithLimit(limit: number): Observable<Product[]> {
    const firstParams = new HttpParams().set('limit', limit.toString()).set('page', '1');
    return this.http.get<any>(this.apiUrl, { params: firstParams }).pipe(
      timeout(10000),
      catchError((err: any) => {
        if (err?.status === 429 && limit === 100) {
          // Fallback sur 429 : réessaie avec limit=20 (une seule petite requête)
          console.warn('[ProductService] 429 détecté, fallback limit=20');
          return this.tryLoadWithLimit(20);
        }
        console.error('[ProductService] Erreur chargement produits:', err);
        return of([]);
      }),
      mergeMap((firstPage: any) => {
        const data: Product[] = firstPage.data || [];
        const total = firstPage.total || data.length;
        const pages = firstPage.pages || 1;

        if (pages <= 1) {
          return of(data);
        }

        // Chargement séquentiel des pages restantes avec délai (pas de forkJoin)
        const pageObservables: Observable<Product[]>[] = [];
        for (let p = 2; p <= pages; p++) {
          const pageParams = new HttpParams().set('limit', limit.toString()).set('page', p.toString());
          pageObservables.push(
            timer((p - 2) * 500).pipe(
              // délai progressif de 500ms entre chaque page
              mergeMap(() => this.http.get<any>(this.apiUrl, { params: pageParams }).pipe(
                timeout(10000),
                catchError((err: any) => {
                  if (err?.status === 429) {
                    console.warn(`[ProductService] 429 page ${p}, skip`);
                    return of([]);
                  }
                  return of([]);
                }),
                map((pageData: any) => pageData.data || [])
              ))
            )
          );
        }

        if (pageObservables.length === 0) {
          return of(data);
        }

        // concatMap charge les pages l'une après l'autre (séquentiel)
        return of(data).pipe(
          concatMap(acc => {
            return pageObservables.reduce(
              (acc$, obs$) => acc$.pipe(concatMap(accData => obs$.pipe(map(pageData => [...accData, ...pageData])))),
              of(acc)
            );
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
