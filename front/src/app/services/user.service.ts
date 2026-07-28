import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { environment } from '../../environments/environment';
import { catchError } from 'rxjs/operators';

export interface User {
  id: string;
  username: string;
  fullName: string;
  email: string;
  role: string;
  isActive?: boolean;
  createdAt?: string;
}

export interface CreateUserRequest {
  username: string;
  password: string;
  email: string;
  fullName: string;
  role: string;
}

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private apiUrl = `${environment.apiUrl}/api/users`;

  constructor(private http: HttpClient) { }

  getUsers(): Observable<User[]> {
    return this.http.get<User[]>(this.apiUrl).pipe(
      catchError(() => of([]))
    );
  }

  getUser(id: string): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}/${id}`);
  }

  createUser(user: Partial<User> & { username: string; password: string }): Observable<User> {
    return this.http.post<User>(this.apiUrl, user);
  }

  updateUser(id: string, user: Partial<User>): Observable<User> {
    return this.http.put<User>(`${this.apiUrl}/${id}`, user);
  }

  deleteUser(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  blockUser(id: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}/block`, {});
  }

  unblockUser(id: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}/unblock`, {});
  }

  registerUser(data: { username: string; password: string; fullName?: string; email?: string; role: string }): Observable<User> {
    return this.http.post<User>(`${environment.apiUrl}/api/auth/register`, data);
  }
}