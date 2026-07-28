import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { environment } from '../../../environments/environment';
import { PdfService } from '../../services/pdf';
import { ReceiptsResolved } from '../../resolvers/receipts.resolver';

interface OrderItem {
  id: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  Product?: { name: string };
}

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  totalAmount: number;
  subtotal: number;
  paidAmount: number;
  tax: number;
  discount: number;
  paymentMethod: string;
  createdAt: string;
  Customer?: { name: string; phone?: string };
  products?: OrderItem[];
}

type FilterStatus = 'all' | 'paid' | 'pending' | 'cancelled';

@Component({
  selector: 'app-receipts',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div>
          <h1 class="page-title">Reçus de vente</h1>
          <p class="page-subtitle">Retrouvez et réimprimez tous les reçus des commandes passées</p>
        </div>
      </div>

      <!-- Filters -->
      <div class="filter-bar">
        <button class="filter-btn" [class.active]="filter === 'all'" (click)="filter = 'all'">
          Toutes ({{ orders.length }})
        </button>
        <button class="filter-btn" [class.active]="filter === 'paid'" (click)="filter = 'paid'">
          ✅ Payées ({{ counts.paid }})
        </button>
        <button class="filter-btn" [class.active]="filter === 'pending'" (click)="filter = 'pending'">
          ⏳ En attente ({{ counts.pending }})
        </button>
        <button class="filter-btn" [class.active]="filter === 'cancelled'" (click)="filter = 'cancelled'">
          ❌ Annulées ({{ counts.cancelled }})
        </button>
        <input type="text" [(ngModel)]="searchQuery" placeholder="🔍 N° commande, client..." class="form-input search-input" />
      </div>

      <!-- Loading -->
      <div class="loading-state" *ngIf="loading">
        <div class="spinner"></div>
        <p>Chargement des commandes...</p>
      </div>

      <!-- Empty -->
      <div class="empty-state" *ngIf="!loading && filtered.length === 0">
        <span class="empty-icon">🧾</span>
        <h3 class="empty-title">Aucun reçu trouvé</h3>
        <p class="empty-text">Effectuez d'abord des ventes dans le POS.</p>
      </div>

      <!-- Receipts list -->
      <div class="receipt-grid" *ngIf="!loading && filtered.length > 0">
        <div class="card receipt-card" *ngFor="let order of filtered; trackBy: trackByOrderId" [class]="'status-' + order.status">
          <div class="card-body">
            <div class="receipt-header">
              <div class="receipt-info">
                <span class="receipt-number">#{{ order.orderNumber }}</span>
                <span class="receipt-date">{{ order.createdAt | date:'dd MMM yyyy HH:mm' }}</span>
              </div>
              <span class="badge" [class]="'badge-' + getStatusClass(order.status)">
                {{ getStatusLabel(order.status) }}
              </span>
            </div>

            <div class="receipt-details">
              <div class="detail-row" *ngIf="order.Customer">
                <span class="detail-label">Client</span>
                <span class="detail-value">{{ order.Customer.name }}</span>
              </div>
              <div class="detail-row" *ngIf="order.Customer?.phone">
                <span class="detail-label">Tél</span>
                <span class="detail-value">{{ order.Customer!.phone }}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Paiement</span>
                <span class="detail-value">{{ getPaymentLabel(order.paymentMethod) }}</span>
              </div>
              <div class="detail-row" *ngIf="order.products">
                <span class="detail-label">Articles</span>
                <span class="detail-value">{{ order.products.length }} produit(s)</span>
              </div>
              <div class="divider"></div>
              <div class="detail-row total">
                <span class="detail-label">Total</span>
                <span class="detail-value amount">{{ order.totalAmount | number }} FCFA</span>
              </div>
              <div class="detail-row paid" *ngIf="order.paidAmount > 0">
                <span class="detail-label">Payé</span>
                <span class="detail-value amount">{{ order.paidAmount | number }} FCFA</span>
              </div>
            </div>

            <div class="card-actions">
              <button class="btn btn-primary btn-sm" (click)="printReceipt(order)" [disabled]="order.status === 'cancelled'">
                🖨️ Réimprimer
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .page-container { padding: 24px; }
    .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }

    .filter-bar { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin-bottom: 24px; }
    .filter-btn { padding: 6px 14px; border-radius: 20px; border: 1px solid var(--border); background: var(--surface); cursor: pointer; font-size: 13px; transition: all 0.2s; }
    .filter-btn:hover { border-color: var(--primary-light); }
    .filter-btn.active { background: var(--primary); color: #fff; border-color: var(--primary); }
    .search-input { margin-left: auto; max-width: 260px; padding: 8px 12px !important; font-size: 13px !important; }

    .receipt-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 16px; }
    .receipt-card { transition: all 0.2s; }
    .receipt-card:hover { transform: translateY(-2px); box-shadow: var(--shadow-md); }
    .receipt-card.status-cancelled { opacity: 0.6; }

    .receipt-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; }
    .receipt-info { display: flex; flex-direction: column; gap: 2px; }
    .receipt-number { font-weight: 700; font-size: 16px; color: var(--text-primary); }
    .receipt-date { font-size: 12px; color: var(--text-muted); }

    .receipt-details { display: flex; flex-direction: column; gap: 6px; margin-bottom: 16px; }
    .detail-row { display: flex; justify-content: space-between; font-size: 13px; }
    .detail-label { color: var(--text-muted); }
    .detail-value { font-weight: 500; }
    .divider { height: 1px; background: var(--border-light); margin: 4px 0; }
    .total .amount { font-size: 18px; font-weight: 800; color: var(--primary); }
    .paid .amount { color: var(--success); }

    .badge { padding: 3px 10px; border-radius: 12px; font-size: 11px; font-weight: 600; }
    .badge-paid, .badge-delivered { background: #d4edda; color: #155724; }
    .badge-pending { background: #fff3cd; color: #856404; }
    .badge-partially_paid { background: #cce5ff; color: #004085; }
    .badge-cancelled { background: #f8d7da; color: #721c24; }
    .badge-shipped { background: #d1ecf1; color: #0c5460; }

    .loading-state, .empty-state { text-align: center; padding: 60px; }
    .empty-icon { font-size: 48px; display: block; margin-bottom: 12px; }

    @media (max-width: 768px) {
      .receipt-grid { grid-template-columns: 1fr; }
      .filter-bar { flex-direction: column; align-items: stretch; }
      .search-input { max-width: none; margin-left: 0; }
    }
  `]
})
export class ReceiptsComponent implements OnInit {
  orders: Order[] = [];
  loading = true;
  filter: FilterStatus = 'all';
  searchQuery = '';

  trackByOrderId(index: number, item: any): string {
    return item?.id ?? index;
  }

  constructor(private http: HttpClient, private pdfService: PdfService, private route: ActivatedRoute) {}

  ngOnInit(): void {
    const resolved = this.route.snapshot.data['data'] as ReceiptsResolved;
    this.orders = resolved?.orders || [];
    this.loading = false;

    this.route.queryParams.subscribe(params => {
      if (params['filter']) {
        this.filter = params['filter'] as FilterStatus;
      }
      if (params['search']) {
        this.searchQuery = params['search'];
      }
    });
  }

  get filtered(): Order[] {
    let result = this.orders;
    if (this.filter === 'paid') {
      result = result.filter(o => o.status === 'paid' || o.status === 'delivered');
    } else if (this.filter === 'pending') {
      result = result.filter(o => o.status === 'pending' || o.status === 'partially_paid');
    } else if (this.filter === 'cancelled') {
      result = result.filter(o => o.status === 'cancelled');
    }
    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      result = result.filter(o =>
        (o.orderNumber || '').toLowerCase().includes(q) ||
        (o.Customer?.name || '').toLowerCase().includes(q)
      );
    }
    return result;
  }

  get counts() {
    return {
      paid: this.orders.filter(o => o.status === 'paid' || o.status === 'delivered').length,
      pending: this.orders.filter(o => o.status === 'pending' || o.status === 'partially_paid').length,
      cancelled: this.orders.filter(o => o.status === 'cancelled').length,
    };
  }

  private loadOrders(): void {
    this.http.get<any>(`${environment.apiUrl}/api/orders`).subscribe({
      next: (data) => { this.orders = data.data || data; this.loading = false; },
      error: (err) => { 
        console.error('Failed to load orders:', err); 
        this.loading = false; 
      }
    });
  }

  getStatusClass(status: string): string {
    return status || 'pending';
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      pending: 'En attente', paid: 'Payée', partially_paid: 'Partielle',
      shipped: 'Expédiée', delivered: 'Livrée', cancelled: 'Annulée'
    };
    return labels[status] || status;
  }

  getPaymentLabel(method: string): string {
    const labels: Record<string, string> = {
      cash: '💵 Espèces', orange_money: '🟠 Orange Money',
      moov_money: '🔵 Mobile Cash', wave: '🟢 Wave', card: '💳 Carte'
    };
    return labels[method] || method;
  }

  printReceipt(order: Order): void {
    this.pdfService.generateReceipt({
      orderNumber: order.orderNumber,
      paymentMethod: this.getPaymentLabel(order.paymentMethod),
      subtotal: order.subtotal,
      discount: order.discount,
      tax: order.tax,
      totalAmount: order.totalAmount,
      items: (order.products || []).map(item => ({
        productName: item.Product?.name || 'Produit',
        quantity: item.quantity,
        unitPrice: item.unitPrice
      }))
    });
  }
}
