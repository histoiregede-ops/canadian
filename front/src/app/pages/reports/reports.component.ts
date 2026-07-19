import { Component, OnInit, AfterViewInit, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Chart, registerables } from 'chart.js';
import { Subscription } from 'rxjs';
import { ActivatedRoute } from '@angular/router';
import { ReportsService, ReportsData } from '../../services/reports.service';
import { RefreshService } from '../../services/refresh.service';

Chart.register(...registerables);

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule],
  styleUrls: ['./reports.component.css'],
  template: `
    <div class="container">
      <h1>Rapports commerciaux</h1>

      <div *ngIf="loading" class="loading">Chargement des rapports...</div>

      <ng-container *ngIf="!loading && data">
        <div class="stats-grid">
          <div class="stat-card">
            <span class="stat-label">CA du mois</span>
            <span class="stat-value">{{ data.monthlyRevenue | number }} FCFA</span>
          </div>
          <div class="stat-card">
            <span class="stat-label">Produits vendus (top)</span>
            <span class="stat-value">{{ getTopTotalSold() }}</span>
          </div>
          <div class="stat-card">
            <span class="stat-label">Installations</span>
            <span class="stat-value">{{ getTotalRepairs() }}</span>
          </div>
          <div class="stat-card">
            <span class="stat-label">Catégories</span>
            <span class="stat-value">{{ data.categoryDistribution.length }}</span>
          </div>
        </div>

        <div class="grid-2">
          <div class="chart-card">
            <h3>Évolution du CA mensuel</h3>
            <div class="chart-wrapper"><canvas #revenueChart></canvas></div>
          </div>
          <div class="chart-card">
            <h3>Top produits vendus</h3>
            <div class="chart-wrapper"><canvas #topProductsChart></canvas></div>
          </div>
          <div class="chart-card">
            <h3>Répartition par catégorie</h3>
            <div class="chart-wrapper"><canvas #categoryChart></canvas></div>
          </div>
          <div class="chart-card">
            <h3>Performance techniciens</h3>
            <div class="chart-wrapper"><canvas #techChart></canvas></div>
          </div>
        </div>

        <div class="card mt-6">
          <h3>Top 10 produits</h3>
          <div class="table-container">
            <table class="table">
              <thead>
                <tr><th>Produit</th><th>Qté vendue</th><th>CA généré</th></tr>
              </thead>
              <tbody>
                <tr *ngFor="let p of data.topProducts">
                  <td>{{ p.name }}</td>
                  <td>{{ p.totalSold }}</td>
                  <td>{{ p.totalRevenue | number }} FCFA</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </ng-container>
    </div>
  `
})
export class ReportsComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('revenueChart') private revenueChartRef!: ElementRef;
  @ViewChild('topProductsChart') private topProductsChartRef!: ElementRef;
  @ViewChild('categoryChart') private categoryChartRef!: ElementRef;
  @ViewChild('techChart') private techChartRef!: ElementRef;

  data: ReportsData | null = null;
  loading = true;
  private refreshSub: Subscription | null = null;

  private revenueChart: Chart | null = null;
  private topChart: Chart | null = null;
  private catChart: Chart | null = null;
  private techChart: Chart | null = null;

  constructor(private route: ActivatedRoute, private reportsService: ReportsService, private refreshService: RefreshService) {}

  ngOnInit() {
    this.route.data.subscribe(({ data }) => {
      if (data) {
        this.data = data.data;
        this.loading = false;
        setTimeout(() => this.renderCharts(), 500);
      }
    });
    this.refreshSub = this.refreshService.refresh$.subscribe(() => {
      this.reportsService.getDashboard().subscribe({
        next: (data) => { this.data = data; this.loading = false; setTimeout(() => this.renderCharts(), 500); },
        error: () => { this.loading = false; }
      });
    });
  }

  ngAfterViewInit() {
    setTimeout(() => this.renderCharts(), 500);
  }

  private renderCharts() {
    if (!this.data) return;
    if (this.revenueChartRef) this.renderRevenueChart();
    if (this.topProductsChartRef) this.renderTopProductsChart();
    if (this.categoryChartRef) this.renderCategoryChart();
    if (this.techChartRef) this.renderTechChart();
  }

  private renderRevenueChart() {
    if (!this.data?.revenueEvolution.length) return;
    const ctx = this.revenueChartRef.nativeElement.getContext('2d');
    if (this.revenueChart) this.revenueChart.destroy();
    this.revenueChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: this.data.revenueEvolution.map(r => r.month),
        datasets: [{
          label: 'CA (FCFA)',
          data: this.data.revenueEvolution.map(r => r.revenue),
          borderColor: '#667eea',
          backgroundColor: 'rgba(102,126,234,0.1)',
          fill: true, tension: 0.4,
          borderWidth: 3, pointBackgroundColor: '#667eea'
        }]
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true, grid: { color: '#f1f5f9' } }, x: { grid: { display: false } } } }
    });
  }

  private renderTopProductsChart() {
    if (!this.data?.topProducts.length) return;
    const top5 = this.data.topProducts.slice(0, 5);
    const colors = ['#667eea', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6'];
    const ctx = this.topProductsChartRef.nativeElement.getContext('2d');
    if (this.topChart) this.topChart.destroy();
    this.topChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: top5.map(p => p.name.length > 20 ? p.name.substring(0, 20) + '...' : p.name),
        datasets: [{ label: 'Qté vendue', data: top5.map(p => p.totalSold), backgroundColor: colors, borderRadius: 6 }]
      },
      options: { responsive: true, maintainAspectRatio: false, indexAxis: 'y',
        plugins: { legend: { display: false } },
        scales: { x: { beginAtZero: true, grid: { color: '#f1f5f9' } }, y: { grid: { display: false } } } }
    });
  }

  private renderCategoryChart() {
    if (!this.data?.categoryDistribution.length) return;
    const colors = ['#667eea', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6'];
    const ctx = this.categoryChartRef.nativeElement.getContext('2d');
    if (this.catChart) this.catChart.destroy();
    this.catChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: this.data.categoryDistribution.map(c => c.name),
        datasets: [{ data: this.data.categoryDistribution.map(c => c.count), backgroundColor: colors.slice(0, this.data.categoryDistribution.length), borderWidth: 0 }]
      },
      options: { responsive: true, maintainAspectRatio: false, cutout: '65%',
        plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, padding: 15 } } } }
    });
  }

  private renderTechChart() {
    if (!this.data?.technicianPerformance.length) return;
    const ctx = this.techChartRef.nativeElement.getContext('2d');
    if (this.techChart) this.techChart.destroy();
    this.techChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: this.data.technicianPerformance.map(t => t.fullName),
        datasets: [{ label: 'Installations', data: this.data.technicianPerformance.map(t => t.totalInstallations), backgroundColor: '#22c55e', borderRadius: 6 }]
      },
      options: { responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true, grid: { color: '#f1f5f9' } }, x: { grid: { display: false } } } }
    });
  }

  getTopTotalSold(): number {
    return this.data?.topProducts.reduce((s, p) => s + p.totalSold, 0) || 0;
  }

  getTotalRepairs(): number {
    return this.data?.technicianPerformance.reduce((s, t) => s + t.totalInstallations, 0) || 0;
  }

  ngOnDestroy(): void {
    this.refreshSub?.unsubscribe();
  }
}
