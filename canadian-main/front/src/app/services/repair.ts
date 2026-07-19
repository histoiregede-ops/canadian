import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';


export interface Repair {
  id?: string;
  deviceType: string;
  brand?: string;
  serialNumber?: string;
  reportedIssue: string;
  diagnosis?: string;
  resolution?: string;
  estimatedCost?: number;
  finalCost?: number;
  status: string;
  priority?: string;
  receivedAt?: string;
  completedAt?: string;
  customerId?: string;
  Customer?: any;
}

@Injectable({
  providedIn: 'root'
})
export class RepairService {
  private apiUrl = `${environment.apiUrl}/api/repairs`;

  constructor(private http: HttpClient) { }

  getRepairs(): Observable<Repair[]> {
    return this.http.get<Repair[]>(this.apiUrl);
  }

  createRepair(repair: Repair): Observable<Repair> {
    return this.http.post<Repair>(this.apiUrl, repair);
  }

  updateRepair(id: string, repair: Repair): Observable<Repair> {
    return this.http.put<Repair>(`${this.apiUrl}/${id}`, repair);
  }

  deleteRepair(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }
}
