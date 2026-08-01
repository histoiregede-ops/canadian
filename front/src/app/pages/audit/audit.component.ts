import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuditService } from '../../services/audit.service';

@Component({
  selector: 'app-audit',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './audit.component.html',
  styleUrls: ['./audit.component.css']
})
export class AuditComponent implements OnInit {
  logs: any[] = [];
  page = 1;
  limit = 50;
  total = 0;
  loading = false;
  // filters
  userId = '';
  entityType = '';
  action = '';
  startDate = '';
  endDate = '';

  constructor(private audit: AuditService) {}

  ngOnInit(): void {
    this.load();
  }

  async load(page = 1) {
    this.loading = true;
    this.page = page;
    try {
      const filters: any = {};
      if (this.userId) filters.userId = this.userId;
      if (this.entityType) filters.entityType = this.entityType;
      if (this.action) filters.action = this.action;
      if (this.startDate) filters.startDate = this.startDate;
      if (this.endDate) filters.endDate = this.endDate;
      const res: any = await this.audit.list(this.page, this.limit, filters);
      this.logs = res.data || [];
      this.total = res.total || 0;
    } catch (err) {
      console.error('Failed to load audit logs', err);
    } finally {
      this.loading = false;
    }
  }

  applyFilters() { this.load(1); }
  clearFilters() { this.userId = this.entityType = this.action = this.startDate = this.endDate = ''; this.load(1); }

  downloadCsv() {
    if (!this.logs || this.logs.length === 0) return;
    const keys = ['createdAt','username','role','entityType','entityId','action','details'];
    const rows = [keys.join(',')];
    for (const l of this.logs) {
      const vals = keys.map(k => {
        let v = l[k] ?? l[k.toLowerCase()] ?? '';
        if (v === null || v === undefined) v = '';
        v = String(v).replace(/"/g, '""');
        if (v.indexOf(',') >= 0 || v.indexOf('"') >= 0 || v.indexOf('\n') >= 0) v = '"' + v + '"';
        return v;
      });
      rows.push(vals.join(','));
    }
    const csv = rows.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit_logs_${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  fmt(d: string) { return new Date(d).toLocaleString(); }
  get totalPages() { return Math.max(1, Math.ceil((this.total || 0) / this.limit)); }
}
