import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';


export interface Installation {
  id?: string;
  location: string;
  gpsCoordinates?: string;
  kitType?: string;
  components?: string[];
  powerCapacity?: string;
  roofType?: string;
  scheduledDate?: string | Date;
  completionDate?: string | Date;
  status: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  totalPrice?: number;
  notes?: string;
  customerId?: string;
  technicianId?: string;
  orderId?: string;
  orderNumber?: string;
  Customer?: any;
  Technician?: any;
  Order?: any;
}

@Injectable({
  providedIn: 'root'
})
export class InstallationService {
  private apiUrl = `${environment.apiUrl}/api/installations`;

  constructor(private http: HttpClient) { }

  getInstallations(): Observable<Installation[]> {
    return this.http.get<Installation[]>(this.apiUrl);
  }

  createInstallation(installation: Installation): Observable<Installation> {
    return this.http.post<Installation>(this.apiUrl, installation);
  }

  updateInstallation(id: string, installation: Installation): Observable<Installation> {
    return this.http.put<Installation>(`${this.apiUrl}/${id}`, installation);
  }

  deleteInstallation(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }
}
