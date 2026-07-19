import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { WebSocketService } from './websocket';

export interface AppNotification {
  id?: string;
  title: string;
  body: string;
  type: 'order' | 'low_stock' | 'out_of_stock' | 'message' | 'loyalty' | 'info';
  read: boolean;
  createdAt: string;
  link?: string;
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private apiUrl = `${environment.apiUrl}/api/notifications`;
  private notificationsSubject = new BehaviorSubject<AppNotification[]>([]);
  notifications$ = this.notificationsSubject.asObservable();
  private unreadCountSubject = new BehaviorSubject<number>(0);
  unreadCount$ = this.unreadCountSubject.asObservable();

  constructor(
    private http: HttpClient,
    private wsService: WebSocketService
  ) {
    this.wsService.notification$.subscribe(notif => {
      if (notif) {
        this.addNotification({
          title: notif.title,
          body: notif.body,
          type: (notif.type as AppNotification['type']) || 'info',
          read: false,
          createdAt: new Date().toISOString()
        });
      }
    });
  }

  loadNotifications(): void {
    this.http.get<AppNotification[]>(this.apiUrl).subscribe({
      next: (data) => {
        this.notificationsSubject.next(data);
        this.updateUnreadCount();
      },
      error: () => {}
    });
  }

  private addNotification(n: Partial<AppNotification>): void {
    const current = this.notificationsSubject.value;
    const notif: AppNotification = {
      title: n.title || '',
      body: n.body || '',
      type: (n.type as any) || 'info',
      read: false,
      createdAt: new Date().toISOString()
    };
    this.notificationsSubject.next([notif, ...current]);
    this.updateUnreadCount();
  }

  markAsRead(id: string): void {
    const current = this.notificationsSubject.value.map(n =>
      n.id === id ? { ...n, read: true } : n
    );
    this.notificationsSubject.next(current);
    this.updateUnreadCount();
    this.http.patch(`${this.apiUrl}/${id}/read`, {}).subscribe();
  }

  removeNotification(id: string): void {
    const current = this.notificationsSubject.value.filter(n => n.id !== id);
    this.notificationsSubject.next(current);
    this.updateUnreadCount();
    this.http.delete(`${this.apiUrl}/${id}`).subscribe();
  }

  markAllAsRead(): void {
    const current = this.notificationsSubject.value.map(n => ({ ...n, read: true }));
    this.notificationsSubject.next(current);
    this.updateUnreadCount();
    this.http.post(`${this.apiUrl}/read-all`, {}).subscribe();
  }

  private updateUnreadCount(): void {
    const count = this.notificationsSubject.value.filter(n => !n.read).length;
    this.unreadCountSubject.next(count);
  }
}
