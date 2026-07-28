import { Injectable } from '@angular/core';
import { Resolve } from '@angular/router';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

export interface ReceiptsResolved {
  orders: any[];
}

@Injectable({ providedIn: 'root' })
export class ReceiptsResolver implements Resolve<ReceiptsResolved> {
  constructor(private http: HttpClient) {}

  resolve(): Observable<ReceiptsResolved> {
    return this.http.get<any>(`${environment.apiUrl}/api/orders`).pipe(
      map(res => ({ orders: res.data || res || [] })),
      catchError(() => of({ orders: [] }))
    );
  }
}