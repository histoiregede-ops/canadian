import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Chart, registerables } from 'chart.js';
import { EMPTY, Subject, interval, of } from 'rxjs';
import { catchError, startWith, switchMap, takeUntil } from 'rxjs/operators';
import { ApiMetric, MonitoringAlert, MonitoringResponse, MonitoringService } from '../../services/monitoring.service';
import { ToastService } from '../../services/toast.service';

Chart.register(...registerables);

@Component({
  selector: 'app-monitoring',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './monitoring.component.html',
  styleUrls: ['./monitoring.component.css']
})
export class MonitoringComponent implements AfterViewInit, OnDestroy {
  @ViewChild('trafficChart') private trafficChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('latencyChart') private latencyChartRef!: ElementRef<HTMLCanvasElement>;

  metrics: ApiMetric[] = [];
  alerts: MonitoringAlert[] = [];
  system: MonitoringResponse['system'] | null = null;
  loading = true;
  refreshing = false;
  connected = false;
  errorMessage = '';
  lastUpdated: Date | null = null;
  private trafficChart?: Chart;
  private latencyChart?: Chart;
  private readonly destroy$ = new Subject<void>();

  constructor(private monitoring: MonitoringService, private toast: ToastService) {}

  ngAfterViewInit(): void {
    interval(5000).pipe(
      startWith(0),
      switchMap(() => {
        this.refreshing = true;
        return this.monitoring.getMetrics().pipe(catchError((error) => {
          this.connected = false;
          this.errorMessage = error.status === 404
            ? 'Cette version du backend ne contient pas encore le module monitoring. Redéployez le backend Render depuis la branche contenant /api/monitoring/metrics.'
            : error.status === 403 || error.status === 401
            ? 'Accès refusé. Connectez-vous avec un compte administrateur pour consulter le monitoring.'
            : 'Le serveur de monitoring ne répond pas. Vérifiez que le backend est démarré sur le port 3000.';
          this.refreshing = false;
          return error.status === 404 ? EMPTY : of(null);
        }));
      }),
      takeUntil(this.destroy$)
    ).subscribe(response => {
      this.refreshing = false;
      this.loading = false;
      if (response) this.applyResponse(response);
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.trafficChart?.destroy();
    this.latencyChart?.destroy();
  }

  get totalRequests(): number { return this.metrics.reduce((sum, metric) => sum + metric.requests, 0); }
  get totalErrors(): number { return this.metrics.reduce((sum, metric) => sum + metric.errors, 0); }
  get healthyEndpoints(): number { return this.metrics.filter(metric => metric.errors === 0).length; }
  get averageLatency(): number {
    return this.metrics.length ? this.metrics.reduce((sum, metric) => sum + metric.averageDurationMs, 0) / this.metrics.length : 0;
  }

  formatMs(value: number): string { return `${Math.round(value)} ms`; }
  formatRate(value: number): string { return `${Math.round(value * 100)}%`; }
  formatBytes(value: number): string { return `${(value / 1024 / 1024 / 1024).toFixed(1)} Go`; }
  formatUptime(seconds: number): string { return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`; }
  trackByMetric(index: number, metric: ApiMetric): string { return `${metric.method} ${metric.path}` || String(index); }

  refreshNow(): void {
    this.monitoring.getMetrics().subscribe({
      next: response => this.applyResponse(response),
      error: (error) => {
        this.errorMessage = error.status === 404
          ? 'Cette version du backend ne contient pas encore le module monitoring. Redéployez le backend Render depuis la branche contenant /api/monitoring/metrics.'
          : error.status === 403 || error.status === 401
          ? 'Accès refusé. Le compte connecté doit avoir le rôle administrateur.'
          : 'Impossible de récupérer les métriques API. Vérifiez le serveur backend.';
        this.toast.show(this.errorMessage, 'error');
      }
    });
  }

  private applyResponse(response: MonitoringResponse): void {
    this.metrics = [...response.metrics].sort((a, b) => b.requests - a.requests);
    this.alerts = response.alerts || [];
    this.system = response.system;
    this.connected = true;
    this.errorMessage = '';
    this.lastUpdated = new Date(response.generatedAt);
    this.renderCharts();
  }

  private renderCharts(): void {
    if (!this.trafficChartRef || !this.latencyChartRef) return;
    const labels = this.metrics.map(metric => `${metric.method} ${metric.path}`);
    this.trafficChart?.destroy();
    this.latencyChart?.destroy();
    this.trafficChart = new Chart(this.trafficChartRef.nativeElement, {
      type: 'bar',
      data: { labels, datasets: [
        { label: 'Appels', data: this.metrics.map(metric => metric.requests), backgroundColor: '#ef8354', borderRadius: 5 },
        { label: 'Erreurs', data: this.metrics.map(metric => metric.errors), backgroundColor: '#d1495b', borderRadius: 5 }
      ] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } }, scales: { x: { ticks: { display: false } }, y: { beginAtZero: true } } }
    });
    this.latencyChart = new Chart(this.latencyChartRef.nativeElement, {
      type: 'line',
      data: { labels, datasets: [
        { label: 'Moyenne', data: this.metrics.map(metric => metric.averageDurationMs), borderColor: '#176087', backgroundColor: 'rgba(23, 96, 135, .12)', fill: true, tension: .3 },
        { label: 'Maximum', data: this.metrics.map(metric => metric.maxDurationMs), borderColor: '#f4a261', backgroundColor: 'transparent', tension: .3 }
      ] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } }, scales: { x: { ticks: { display: false } }, y: { beginAtZero: true, title: { display: true, text: 'ms' } } } }
    });
  }
}