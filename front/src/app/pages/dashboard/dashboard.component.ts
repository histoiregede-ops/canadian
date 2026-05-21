import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StatsService, DashboardStats, RecentOrder, UrgentRepair } from '../../services/stats';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {
  stats: DashboardStats = {
    dailyIncome: 0,
    dailyExpense: 0,
    dailyOrders: 0,
    activeRepairs: 0,
    plannedInstallations: 0,
    lowStockProducts: 0
  };

  recentOrders: RecentOrder[] = [];
  urgentRepairs: UrgentRepair[] = [];
  loading = true;
  ordersLoading = true;
  repairsLoading = true;

  constructor(private statsService: StatsService) {}

  ngOnInit(): void {
    this.loadStats();
    this.loadRecentOrders();
    this.loadUrgentRepairs();
  }

  loadStats(): void {
    this.loading = true;
    this.statsService.getDashboardStats().subscribe({
      next: (data) => {
        this.stats = data;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading stats:', err);
        this.loading = false;
      }
    });
  }

  loadRecentOrders(): void {
    this.ordersLoading = true;
    this.statsService.getRecentOrders().subscribe({
      next: (data) => {
        this.recentOrders = data;
        this.ordersLoading = false;
      },
      error: (err) => {
        console.error('Error loading recent orders:', err);
        this.ordersLoading = false;
      }
    });
  }

  loadUrgentRepairs(): void {
    this.repairsLoading = true;
    this.statsService.getUrgentRepairs().subscribe({
      next: (data) => {
        this.urgentRepairs = data;
        this.repairsLoading = false;
      },
      error: (err) => {
        console.error('Error loading urgent repairs:', err);
        this.repairsLoading = false;
      }
    });
  }

  getStatusBadge(status: string): string {
    const map: Record<string, string> = {
      paid: 'badge-success',
      pending: 'badge-warning',
      partially_paid: 'badge-warning',
      cancelled: 'badge-danger',
      shipped: 'badge-success',
      delivered: 'badge-success'
    };
    return map[status] || 'badge-warning';
  }

  getStatusLabel(status: string): string {
    const map: Record<string, string> = {
      paid: 'Payé',
      pending: 'En attente',
      partially_paid: 'Partiel',
      cancelled: 'Annulé',
      shipped: 'Expédié',
      delivered: 'Livré'
    };
    return map[status] || status;
  }

  getPriorityBadge(priority?: string): string {
    const map: Record<string, string> = {
      urgent: 'badge-danger',
      high: 'badge-warning',
      normal: 'badge-success',
      low: 'badge-success'
    };
    return map[priority || 'normal'] || 'badge-success';
  }

  getPriorityLabel(priority?: string): string {
    const map: Record<string, string> = {
      urgent: 'Urgent',
      high: 'Haute',
      normal: 'Normale',
      low: 'Basse'
    };
    return map[priority || 'normal'] || priority || 'Normale';
  }

  getRepairStatusLabel(status: string): string {
    const map: Record<string, string> = {
      received: 'Reçu',
      diagnosing: 'Diagnostic',
      waiting_parts: 'En attente pièces',
      repairing: 'En réparation',
      ready: 'Prêt',
      delivered: 'Livré',
      cancelled: 'Annulé'
    };
    return map[status] || status;
  }

  getRepairStatusBadge(status: string): string {
    const map: Record<string, string> = {
      received: 'badge-warning',
      diagnosing: 'badge-warning',
      waiting_parts: 'badge-warning',
      repairing: 'badge-warning',
      ready: 'badge-success',
      delivered: 'badge-success',
      cancelled: 'badge-danger'
    };
    return map[status] || 'badge-warning';
  }

  getDeviceIcon(deviceType: string): string {
    const lower = deviceType.toLowerCase();
    if (lower.includes('phone') || lower.includes('iphone') || lower.includes('smartphone')) return '📱';
    if (lower.includes('laptop') || lower.includes('macbook') || lower.includes('ordinateur')) return '💻';
    if (lower.includes('tablet') || lower.includes('ipad')) return '📟';
    if (lower.includes('printer') || lower.includes('imprimante')) return '🖨️';
    if (lower.includes('solar') || lower.includes('panneau') || lower.includes('kit')) return '☀️';
    return '🔧';
  }

  formatAmount(amount: number): string {
    return new Intl.NumberFormat('fr-FR').format(amount);
  }

  formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }
}
