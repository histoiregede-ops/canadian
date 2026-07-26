import { Injectable } from '@angular/core';
import { Resolve, ActivatedRouteSnapshot } from '@angular/router';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { ProductService } from '../services/product';
import { AuthService } from '../services/auth';

export interface InventoryResolved {
  products: any[];
}

@Injectable({ providedIn: 'root' })
export class InventoryResolver implements Resolve<InventoryResolved> {
  constructor(private productService: ProductService, private authService: AuthService) {}

  resolve(route: ActivatedRouteSnapshot): Observable<InventoryResolved> {
    if (!this.authService.isLoggedIn()) {
      return of({ products: [] });
    }
    return this.productService.getProducts().pipe(
      map(products => ({ products })),
      catchError(() => of({ products: [] }))
    );
  }
}
