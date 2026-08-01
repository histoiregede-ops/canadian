import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class AuditService {
  constructor(private http: HttpClient) {}

  list(page = 1, limit = 50, filters: any = {}) {
    let params = new HttpParams().set('page', String(page)).set('limit', String(limit));
    Object.keys(filters || {}).forEach(k => {
      const v = filters[k];
      if (v !== undefined && v !== null && String(v) !== '') params = params.set(k, String(v));
    });
    return this.http.get('/api/audit', { params }).toPromise();
  }
}
