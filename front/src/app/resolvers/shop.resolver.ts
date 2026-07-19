import { Injectable } from '@angular/core';
import { Resolve, ActivatedRouteSnapshot } from '@angular/router';
import { Observable, forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ProductService } from '../services/product';
import { CategoryService } from '../services/category';

export interface ShopResolved {
  products: any[];
  categories: any[];
}

@Injectable({ providedIn: 'root' })
export class ShopResolver implements Resolve<ShopResolved> {
  constructor(private productService: ProductService, private categoryService: CategoryService) {}

  resolve(route: ActivatedRouteSnapshot): Observable<ShopResolved> {
    return forkJoin({
      products: this.productService.getProducts().pipe(catchError(() => of([]))),
      categories: this.categoryService.getCategories().pipe(catchError(() => of([])))
    });
  }
}
