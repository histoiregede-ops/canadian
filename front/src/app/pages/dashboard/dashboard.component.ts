import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { ActivatedRoute } from '@angular/router';
import { StatsService, DashboardStats, RecentOrder, UrgentRepair } from '../../services/stats';
import { RefreshService } from '../../services/refresh.service';
import { TransferService, TransferSummary } from '../../services/transfer';
import {
  OrderStatusBadgePipe,
  OrderStatusLabelPipe,
  PriorityBadgePipe,
  PriorityLabelPipe,
  DashboardRepairStatusBadgePipe,
  DashboardRepairStatusLabelPipe,
  DeviceIconPipe,
  OperatorLabelPipe
} from '../../pipes/optimized.pipes';

const DEFAULT_STATS: DashboardStats = {
  dailyIncome: 0,
  dailyExpense: 0,
  dailyOrders: 0,
  activeRepairs: 0,
  plannedInstallations: 0,
  lowStockProducts: 0
};

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    OrderStatusBadgePipe,
    OrderStatusLabelPipe,
    PriorityBadgePipe,
    PriorityLabelPipe,
    DashboardRepairStatusBadgePipe,
    DashboardRepairStatusLabelPipe,
    DeviceIconPipe,
    OperatorLabelPipe
  ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit, OnDestroy {
  stats: DashboardStats = { ...DEFAULT_STATS };

  recentOrders: RecentOrder[] = [];
  urgentRepairs: UrgentRepair[] = [];
  transferSummary: TransferSummary | null = null;
  operatorEntries: { key: string; value: { sent: number; received: number; fees: number; count: number } }[] = [];
  loading = true;
  ordersLoading = true;
  repairsLoading = true;
  transfersLoading = true;
  private refreshSub?: Subscription;
  // Caches for expensive computations (pipes have internal caches, component also memoizes operatorEntries)
  private statusBadgeCache = new Map<string, string>();
  private statusLabelCache = new Map<string, string>();
  private priorityCache = new Map<string, string>();
  private deviceIconCache = new Map<string, string>();
  private operatorLabelCache = new Map<string, string>();

  constructor(
    private route: ActivatedRoute,
    private statsService: StatsService,
    private refreshService: RefreshService,
    private transferService: TransferService
  ) {}

  ngOnInit(): void {
    this.route.data.subscribe(({ data }) => {
      if (data) {
        this.stats = data.stats || { ...DEFAULT_STATS };
        this.recentOrders = data.recentOrders || [];
        this.urgentRepairs = data.urgentRepairs || [];
        this.loading = false;
        this.ordersLoading = false;
        this.repairsLoading = false;
      }
    });
    this.loadTransfersSummary();
    this.refreshSub = this.refreshService.refresh$.subscribe(() => {
      this.loadStats();
      this.loadRecentOrders();
      this.loadUrgentRepairs();
      this.loadTransfersSummary();
    });
  }

  ngOnDestroy(): void {
    this.refreshSub?.unsubscribe();
  }

  loadStats(): void {
    this.loading = true;
    this.statsService.getDashboardStats().subscribe({
      next: (data) => {
        this.stats = data || DEFAULT_STATS;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading stats:', err);
        this.stats = DEFAULT_STATS;
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

  loadTransfersSummary(): void {
    this.transfersLoading = true;
    this.transferService.getDailySummary().subscribe({
      next: (data) => {
        this.transferSummary = data;
        this.updateOperatorEntries();
        this.transfersLoading = false;
      },
      error: (err) => {
        console.error('Error loading transfer summary:', err);
        this.transfersLoading = false;
      }
    });
  }

  private updateOperatorEntries(): void {
    if (this.transferSummary?.byOperator) {
      this.operatorEntries = Object.entries(this.transferSummary.byOperator).map(([key, value]) => ({ key, value }));
    } else {
      this.operatorEntries = [];
    }
  }

  trackByOrderNumber(index: number, item: any): string {
    return item?.orderNumber ?? item?.id ?? index;
  }

  trackByRepairId(index: number, item: any): string {
    return item?.id ?? index;
  }

  trackByOperator(index: number, item: { key: string; value: any }): string {
    return item.key;
  }

  formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }
}
