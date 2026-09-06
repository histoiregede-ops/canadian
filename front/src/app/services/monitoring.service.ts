import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface ApiMetric {
  method: string;
  path: string;
  requests: number;
  successes: number;
  errors: number;
  averageDurationMs: number;
  maxDurationMs: number;
  lastDurationMs: number;
  successRate: number;
  errorRate: number;
  statusCodes: Record<string, number>;
}

export interface MonitoringResponse {
  generatedAt: string;
  metrics: ApiMetric[];
  system: {
    cpuPercent: number;
    loadAverage: number;
    memory: { totalBytes: number; freeBytes: number; usedBytes: number; usedPercent: number };
    process: { rssBytes: number; heapUsedBytes: number; heapTotalBytes: number };
    uptimeSeconds: number;
    alerts: MonitoringAlert[];
  };
  alerts: MonitoringAlert[];
}

export interface MonitoringAlert {
  level: 'warning' | 'critical';
  code: string;
  message: string;
}

@Injectable({ providedIn: 'root' })
export class MonitoringService {
  private readonly endpoint = `${environment.apiUrl}/api/monitoring/metrics`;

  constructor(private http: HttpClient) {}

  getMetrics(): Observable<MonitoringResponse> {
    return this.http.get<MonitoringResponse>(this.endpoint);
  }
}