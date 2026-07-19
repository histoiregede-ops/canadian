import { Injectable } from '@angular/core';
import { Resolve, ActivatedRouteSnapshot } from '@angular/router';
import { Observable, forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ProductService } from '../services/product';
import { ConfigService } from '../services/config';
import { AuthService } from '../services/auth';

export interface SalesResolved {
  products: any[];
  config: any;
}

@Injectable({ providedIn: 'root' })
export class SalesResolver implements Resolve<SalesResolved> {
  constructor(private productService: ProductService, private configService: ConfigService, private authService: AuthService) {}

  resolve(route: ActivatedRouteSnapshot): Observable<SalesResolved> {
    if (!this.authService.isLoggedIn()) {
      return of({ products: [], config: { methods: [], whatsapp: '' } });
    }
    return forkJoin({
      products: this.productService.getProducts().pipe(catchError(() => of([]))),
      config: this.configService.getPaymentMethods().pipe(catchError(() => of({ methods: [], whatsapp: '' })))
    });
  }
}
