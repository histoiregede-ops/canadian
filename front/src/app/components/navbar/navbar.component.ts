import { Component, Output, EventEmitter, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { NotificationService, AppNotification } from '../../services/notification.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  providers: [DatePipe],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css']
})
export class NavbarComponent implements OnInit, OnDestroy {
  @Output() toggleSidebar = new EventEmitter<void>();
  today: Date = new Date();
  notifications: AppNotification[] = [];
  unreadCount = 0;
  showNotifications = false;
  private notifSub?: Subscription;
  private unreadSub?: Subscription;

  constructor(private notifService: NotificationService, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.notifSub = this.notifService.notifications$.subscribe(n => {
      this.notifications = n;
      this.cdr.markForCheck();
    });
    this.unreadSub = this.notifService.unreadCount$.subscribe(c => {
      this.unreadCount = c;
      this.cdr.markForCheck();
    });
    this.notifService.loadNotifications();
  }

  ngOnDestroy(): void {
    this.notifSub?.unsubscribe();
    this.unreadSub?.unsubscribe();
  }

  onToggle(): void {
    this.toggleSidebar.emit();
  }

  toggleNotifications(): void {
    this.showNotifications = !this.showNotifications;
  }

  markAsRead(id: string): void {
    this.notifService.markAsRead(id);
  }

  closeNotification(id: string): void {
    this.notifService.removeNotification(id);
  }

  markAllAsRead(): void {
    this.notifService.markAllAsRead();
  }

  getNotificationIcon(type: string): string {
    switch (type) {
      case 'order': return '📦';
      case 'low_stock': return '⚠️';
      case 'out_of_stock': return '🚫';
      case 'message': return '💬';
      case 'loyalty': return '⭐';
      default: return '🔔';
    }
  }
}
