import { Injectable } from '@angular/core';
import { Resolve, ActivatedRouteSnapshot } from '@angular/router';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { CategoryService } from '../services/category';
import { AuthService } from '../services/auth';

export interface CategoriesResolved {
  categories: any[];
}

@Injectable({ providedIn: 'root' })
export class CategoriesResolver implements Resolve<CategoriesResolved> {
  constructor(private categoryService: CategoryService, private authService: AuthService) {}

  resolve(route: ActivatedRouteSnapshot): Observable<CategoriesResolved> {
    if (!this.authService.isLoggedIn()) {
      return of({ categories: [] });
    }
    return this.categoryService.getCategories().pipe(
      map(categories => ({ categories }))
    );
  }
}
