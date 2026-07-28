import { Injectable } from '@angular/core';
import { Resolve } from '@angular/router';
import { Observable, forkJoin, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { PurchaseOrderService, PurchaseOrder } from '../services/purchase-order';
import { SupplierService, Supplier } from '../services/supplier';

export interface PurchaseOrdersResolved {
  allOrders: PurchaseOrder[];
  overdueOrders: PurchaseOrder[];
  suppliers: Supplier[];
}

@Injectable({ providedIn: 'root' })
export class PurchaseOrdersResolver implements Resolve<PurchaseOrdersResolved> {
  constructor(
    private poService: PurchaseOrderService,
    private supplierService: SupplierService
  ) {}

  resolve(): Observable<PurchaseOrdersResolved> {
    return forkJoin({
      allOrders: this.poService.getOrders().pipe(catchError(() => of([]))),
      overdueOrders: this.poService.getOverdue().pipe(catchError(() => of([]))),
      suppliers: this.supplierService.getSuppliers().pipe(catchError(() => of([])))
    }).pipe(
      map(result => ({
        allOrders: result.allOrders || [],
        overdueOrders: result.overdueOrders || [],
        suppliers: result.suppliers || []
      }))
    );
  }
}