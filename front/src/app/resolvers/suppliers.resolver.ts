import { Injectable } from '@angular/core';
import { Resolve, ActivatedRouteSnapshot } from '@angular/router';
import { Observable, forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { SupplierService } from '../services/supplier';
import { ProductService } from '../services/product';
import { AuthService } from '../services/auth';

export interface SuppliersResolved {
  suppliers: any[];
  products: any[];
}

@Injectable({ providedIn: 'root' })
export class SuppliersResolver implements Resolve<SuppliersResolved> {
  constructor(private supplierService: SupplierService, private productService: ProductService, private authService: AuthService) {}

  resolve(route: ActivatedRouteSnapshot): Observable<SuppliersResolved> {
    if (!this.authService.isLoggedIn()) {
      return of({ suppliers: [], products: [] });
    }
    return forkJoin({
      suppliers: this.supplierService.getSuppliers().pipe(catchError(() => of([]))),
      products: this.productService.getProducts().pipe(catchError(() => of([])))
    });
  }
}
