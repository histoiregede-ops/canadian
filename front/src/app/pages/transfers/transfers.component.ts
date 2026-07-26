import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TransferService, Transfer, TransferSummary } from '../../services/transfer';

@Component({
  selector: 'app-transfers',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div>
          <h1 class="page-title">Transferts Mobile Money</h1>
          <p class="page-subtitle">Gestion des cabines de transfert et rapport journalier</p>
        </div>
      </div>

      <!-- Daily Summary -->
      <div class="stats-row mb-6" *ngIf="summary">
        <div class="stat-item">
          <div class="stat-label">Envoyés</div>
          <div class="stat-num">{{ summary.totalSent | number:'1.0-0' }}</div>
          <div class="stat-unit">FCFA</div>
        </div>
        <div class="stat-item">
          <div class="stat-label">Reçus</div>
          <div class="stat-num">{{ summary.totalReceived | number:'1.0-0' }}</div>
          <div class="stat-unit">FCFA</div>
        </div>
        <div class="stat-item">
          <div class="stat-label">Frais</div>
          <div class="stat-num">{{ summary.totalFees | number:'1.0-0' }}</div>
          <div class="stat-unit">FCFA</div>
        </div>
        <div class="stat-item">
          <div class="stat-label">Transactions</div>
          <div class="stat-num">{{ summary.count }}</div>
          <div class="stat-unit">Aujourd'hui</div>
        </div>
      </div>

      <div class="dashboard-grid">
        <div class="dashboard-main">
          <!-- Filters -->
          <div class="card mb-4">
            <div class="card-header">
              <h3 class="card-title">Filtres</h3>
              <button class="btn btn-secondary btn-sm" (click)="resetFilters()">Réinitialiser</button>
            </div>
            <div class="card-body">
              <div class="filter-grid">
                <input type="date" [(ngModel)]="filters.from" class="form-input" />
                <input type="date" [(ngModel)]="filters.to" class="form-input" />
                <select [(ngModel)]="filters.operator" class="form-select">
                  <option value="">Opérateur</option>
                  <option value="orange_money">Orange Money</option>
                  <option value="wave">Wave</option>
                  <option value="moov_money">Moov Money</option>
                </select>
                <select [(ngModel)]="filters.type" class="form-select">
                  <option value="">Type</option>
                  <option value="sent">Envoyé</option>
                  <option value="received">Reçu</option>
                </select>
                <select [(ngModel)]="filters.status" class="form-select">
                  <option value="">Statut</option>
                  <option value="pending">En attente</option>
                  <option value="completed">Complété</option>
                  <option value="failed">Échoué</option>
                  <option value="cancelled">Annulé</option>
                </select>
                <button class="btn btn-primary btn-sm" (click)="loadTransfers()">Filtrer</button>
              </div>
            </div>
          </div>

          <!-- Transfers List -->
          <div class="card">
            <div class="card-header">
              <h3 class="card-title">Historique des transferts</h3>
            </div>
            <div class="loading-state" *ngIf="loading">
              <div class="spinner spinner-sm"></div>
            </div>
            <div class="empty-state" *ngIf="!loading && transfers.length === 0">
              <span class="empty-icon">💸</span>
              <h3 class="empty-title">Aucun transfert</h3>
            </div>
            <div class="table-container" *ngIf="!loading && transfers.length > 0">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Opérateur</th>
                    <th>Type</th>
                    <th>Montant</th>
                    <th>Frais</th>
                    <th>Téléphone</th>
                    <th>Agent</th>
                    <th>Référence</th>
                    <th>Statut</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let t of transfers; trackBy: trackById">
                    <td class="text-muted">{{ t.createdAt | date:'dd/MM/yyyy HH:mm' }}</td>
                    <td>{{ operatorLabel(t.operator) }}</td>
                    <td>{{ t.type === 'sent' ? 'Envoyé' : 'Reçu' }}</td>
                    <td class="amount">{{ t.amount | number:'1.0-0' }}</td>
                    <td class="text-muted">{{ t.fees | number:'1.0-0' }}</td>
                    <td class="text-muted">{{ t.customerPhone || '—' }}</td>
                    <td>{{ t.agentName || '—' }}</td>
                    <td class="text-muted">{{ t.reference || '—' }}</td>
                    <td><span class="badge" [class]="'badge-' + statusClass(t.status)">{{ statusLabel(t.status) }}</span></td>
                    <td>
                      <button class="btn btn-ghost btn-sm" *ngIf="t.status === 'pending'" (click)="confirm(t.id)">✅</button>
                      <button class="btn btn-ghost btn-sm" *ngIf="t.status === 'pending'" (click)="fail(t.id)">❌</button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div class="dashboard-sidebar">
          <!-- Quick Create -->
          <div class="card">
            <div class="card-header">
              <h3 class="card-title">Nouveau transfert</h3>
            </div>
            <div class="card-body">
              <form (submit)="create()" class="form">
                <div class="form-group">
                  <label class="form-label">Opérateur *</label>
                  <select [(ngModel)]="form.operator" name="operator" class="form-select" required>
                    <option value="">Sélectionner</option>
                    <option value="orange_money">Orange Money</option>
                    <option value="wave">Wave</option>
                    <option value="moov_money">Moov Money</option>
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label">Type *</label>
                  <select [(ngModel)]="form.type" name="type" class="form-select" required>
                    <option value="sent">Envoyé</option>
                    <option value="received">Reçu</option>
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label">Montant *</label>
                  <input type="number" [(ngModel)]="form.amount" name="amount" class="form-input" min="0" step="1" required />
                </div>
                <div class="form-group">
                  <label class="form-label">Frais</label>
                  <input type="number" [(ngModel)]="form.fees" name="fees" class="form-input" min="0" step="1" />
                </div>
                <div class="form-group">
                  <label class="form-label">Téléphone</label>
                  <input type="text" [(ngModel)]="form.customerPhone" name="customerPhone" class="form-input" />
                </div>
                <div class="form-group">
                  <label class="form-label">Référence</label>
                  <input type="text" [(ngModel)]="form.reference" name="reference" class="form-input" />
                </div>
                <div class="form-group">
                  <label class="form-label">Agent</label>
                  <input type="text" [(ngModel)]="form.agentName" name="agentName" class="form-input" />
                </div>
                <div class="form-group">
                  <label class="form-label">Note</label>
                  <textarea [(ngModel)]="form.note" name="note" class="form-textarea" rows="2"></textarea>
                </div>
                <button type="submit" class="btn btn-primary btn-block">Enregistrer le transfert</button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .dashboard-grid {
      display: grid;
      grid-template-columns: 2fr 1fr;
      gap: var(--grid-gap);
      align-items: start;
    }

    .dashboard-main,
    .dashboard-sidebar {
      display: flex;
      flex-direction: column;
      gap: var(--card-gap);
    }

    .filter-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
      gap: var(--space-3);
      align-items: end;
    }

    .form {
      display: flex;
      flex-direction: column;
      gap: var(--space-4);
    }

    .stat-item {
      flex-direction: column;
      gap: var(--space-1);
      transition: transform var(--transition-fast), box-shadow var(--transition-fast);
    }

    .stat-item:hover {
      transform: translateY(-2px);
      box-shadow: var(--shadow-md);
    }

    .stat-unit {
      font-size: var(--font-xs);
      color: var(--text-muted);
      font-weight: 500;
    }

    .amount {
      font-weight: 700;
      color: var(--text-primary);
    }

    .empty-icon {
      font-size: 40px;
      line-height: 1;
      margin-bottom: 0;
      opacity: 1;
    }

    .empty-title {
      color: var(--text-primary);
      margin: 0;
    }

    .spinner-sm {
      width: 20px;
      height: 20px;
      border-radius: 50%;
      border: 2px solid var(--border);
      border-top-color: var(--primary);
      animation: spin 1s linear infinite;
    }

    @media (max-width: 1024px) {
      .dashboard-grid {
        grid-template-columns: 1fr;
      }
    }

    @media (max-width: 768px) {
      .filter-grid {
        grid-template-columns: 1fr;
      }

      .dashboard-main,
      .dashboard-sidebar {
        gap: var(--space-4);
      }
    }
  `]
})
export class TransfersComponent implements OnInit {
  transfers: Transfer[] = [];
  summary: TransferSummary | null = null;
  loading = true;
  page = 1;
  totalPages = 1;
  filters: any = {};

  form: any = {
    operator: '',
    type: 'sent',
    amount: 0,
    fees: 0,
    customerPhone: '',
    reference: '',
    agentName: '',
    note: ''
  };

  constructor(private transferService: TransferService) {}

  ngOnInit(): void {
    this.loadSummary();
    this.loadTransfers();
  }

  loadSummary(): void {
    this.transferService.getDailySummary().subscribe({
      next: (data) => this.summary = data,
      error: (err) => console.error('Failed to load transfer summary:', err)
    });
  }

  loadTransfers(): void {
    this.loading = true;
    this.transferService.getTransfers({ ...this.filters, page: this.page }).subscribe({
      next: (res) => {
        this.transfers = res.data;
        this.totalPages = res.pages;
        this.loading = false;
      },
      error: (err) => {
        console.error('Failed to load transfers:', err);
        this.loading = false;
      }
    });
  }

  resetFilters(): void {
    this.filters = {};
    this.page = 1;
    this.loadTransfers();
  }

  create(): void {
    if (!this.form.operator || !this.form.amount) return;
    this.transferService.createTransfer(this.form).subscribe({
      next: () => {
        this.form = { operator: '', type: 'sent', amount: 0, fees: 0, customerPhone: '', reference: '', agentName: '', note: '' };
        this.loadSummary();
        this.loadTransfers();
      },
      error: (err) => alert(err.error?.error || 'Erreur lors de la création')
    });
  }

  confirm(id: string): void {
    this.transferService.confirmTransfer(id).subscribe(() => this.loadTransfers());
  }

  fail(id: string): void {
    this.transferService.failTransfer(id).subscribe(() => this.loadTransfers());
  }

  trackById(index: number, item: Transfer): string {
    return item.id;
  }

  operatorLabel(op: string): string {
    const map: Record<string, string> = { orange_money: 'Orange Money', wave: 'Wave', moov_money: 'Moov Money' };
    return map[op] || op;
  }

  statusLabel(status: string): string {
    const map: Record<string, string> = { pending: 'En attente', completed: 'Complété', failed: 'Échoué', cancelled: 'Annulé' };
    return map[status] || status;
  }

  statusClass(status: string): string {
    const map: Record<string, string> = { pending: 'warning', completed: 'success', failed: 'danger', cancelled: 'danger' };
    return map[status] || 'warning';
  }
}
