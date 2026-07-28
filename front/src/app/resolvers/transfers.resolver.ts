import { Injectable } from '@angular/core';
import { Resolve } from '@angular/router';
import { Observable, forkJoin, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { TransferService, TransferSummary, TransferListResponse } from '../services/transfer';

export interface TransfersResolved {
  transfers: TransferListResponse;
  summary: TransferSummary | null;
}

@Injectable({ providedIn: 'root' })
export class TransfersResolver implements Resolve<TransfersResolved> {
  constructor(private transferService: TransferService) {}

  resolve(): Observable<TransfersResolved> {
    return forkJoin({
      transfers: this.transferService.getTransfers({ page: 1 }).pipe(
        catchError(() => of({ data: [], total: 0, page: 1, pages: 1 }))
      ),
      summary: this.transferService.getDailySummary().pipe(
        catchError(() => of(null))
      )
    }).pipe(
      map(result => ({
        transfers: result.transfers,
        summary: result.summary
      }))
    );
  }
}