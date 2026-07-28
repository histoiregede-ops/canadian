import { Injectable } from '@angular/core';
import { Resolve, ActivatedRouteSnapshot } from '@angular/router';
import { Observable, forkJoin, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { MovementService, MovementsResponse, MovementSummary } from '../services/movement';
import { ProductService } from '../services/product';

export interface MovementsResolved {
  products: any[];
  reasons: string[];
  movements: StockMovement[];
  summary: MovementSummary | null;
  total: number;
  pages: number;
}

interface StockMovement {
  id: number;
  productId: string;
  previousQuantity: number;
  newQuantity: number;
  changeAmount: number;
  reason: string;
  reference: string | null;
  createdBy: string | null;
  createdAt: string;
  Product?: {
    id: string;
    name: string;
    price: number;
    Category?: { name: string };
  };
}

@Injectable({ providedIn: 'root' })
export class MovementsResolver implements Resolve<MovementsResolved> {
  constructor(private movementService: MovementService, private productService: ProductService) {}

  resolve(route: ActivatedRouteSnapshot): Observable<MovementsResolved> {
    return forkJoin({
      products: this.productService.getProducts().pipe(catchError(() => of([]))),
      reasons: this.movementService.getReasons().pipe(catchError(() => of([]))),
      movements: this.movementService.getMovements({ page: 1, limit: 50 }).pipe(
        catchError(() => of({ movements: [], total: 0, page: 1, pages: 1 } as MovementsResponse))
      ),
      summary: this.movementService.getMovementsSummary({ page: 1, limit: 50 }).pipe(
        catchError(() => of(null))
      )
    }).pipe(
      map(result => ({
        products: result.products || [],
        reasons: result.reasons || [],
        movements: (result.movements as MovementsResponse).movements || [],
        summary: result.summary,
        total: (result.movements as MovementsResponse).total || 0,
        pages: (result.movements as MovementsResponse).pages || 1
      }))
    );
  }
}