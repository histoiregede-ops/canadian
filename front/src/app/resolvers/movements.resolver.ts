import { Injectable } from '@angular/core';
import { Resolve, ActivatedRouteSnapshot } from '@angular/router';
import { Observable, forkJoin, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { MovementService } from '../services/movement';
import { ProductService } from '../services/product';

export interface MovementsResolved {
  products: any[];
  reasons: string[];
}

@Injectable({ providedIn: 'root' })
export class MovementsResolver implements Resolve<MovementsResolved> {
  constructor(private movementService: MovementService, private productService: ProductService) {}

  resolve(route: ActivatedRouteSnapshot): Observable<MovementsResolved> {
    return forkJoin({
      products: this.productService.getProducts().pipe(catchError(() => of([]))),
      reasons: this.movementService.getReasons().pipe(catchError(() => of([])))
    }).pipe(
      map(result => ({
        products: result.products || [],
        reasons: result.reasons || []
      }))
    );
  }
}
