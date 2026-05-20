import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { ConfigService } from '../../services/config';
import { PdfService } from '../../services/pdf';

interface OrderItem {
  id: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  Product?: { name: string; photo?: string };
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
  deliveryAddress: string;
  createdAt: string;
  Customer?: { name: string; email: string; phone?: string };
  products?: OrderItem[];
}

const TIMELINE_STEPS = [
  { key: 'pending', label: 'En attente', icon: '📋' },
  { key: 'paid', label: 'Payée', icon: '✅' },
  { key: 'shipped', label: 'Expédiée', icon: '🚚' },
  { key: 'delivered', label: 'Livrée', icon: '📦' },
];

const STATUS_ORDER: Record<string, number> = {
  pending: 0,
  partially_paid: 0,
  paid: 1,
  shipped: 2,
  delivered: 3,
  cancelled: -1,
};

@Component({
  selector: 'app-order-detail',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="order-detail-container">
      <div class="back-link">
        <a routerLink="/client/dashboard">&larr; Retour à mon espace</a>
      </div>

      <div *ngIf="loading" class="loading">Chargement...</div>

      <ng-container *ngIf="!loading && order">
        <div class="order-header">
          <div>
            <h1>Commande #{{ order.orderNumber }}</h1>
            <span class="order-date">{{ order.createdAt | date:'dd/MM/yyyy HH:mm' }}</span>
          </div>
          <span class="status-badge" [class]="'status-' + order.status">{{ getStatusLabel(order.status) }}</span>
        </div>

        <button class="btn-invoice" (click)="downloadInvoice()">📄 Télécharger la facture</button>

        <!-- Timeline -->
        <div class="timeline" *ngIf="order.status !== 'cancelled'">
          <div class="timeline-step" *ngFor="let step of timelineSteps; let i = index"
               [class.active]="i <= currentStepIndex"
               [class.current]="i === currentStepIndex">
            <div class="step-marker">
              <span class="step-icon">{{ step.icon }}</span>
              <div class="step-line" *ngIf="i < timelineSteps.length - 1"></div>
            </div>
            <div class="step-content">
              <span class="step-label">{{ step.label }}</span>
              <span class="step-date" *ngIf="i <= currentStepIndex && orderDates[i]">{{ orderDates[i] }}</span>
            </div>
          </div>
          <div class="timeline-done">
            <div class="step-marker">
              <span class="step-icon">🎉</span>
            </div>
            <div class="step-content">
              <span class="step-label">Terminée</span>
            </div>
          </div>
        </div>

        <div class="timeline cancelled" *ngIf="order.status === 'cancelled'">
          <div class="timeline-step cancelled-step">
            <div class="step-marker">
              <span class="step-icon">❌</span>
            </div>
            <div class="step-content">
              <span class="step-label">Commande annulée</span>
            </div>
          </div>
        </div>

        <div class="detail-grid">
          <div class="detail-card">
            <h3>Articles</h3>
            <div class="order-items">
              <div class="order-item" *ngFor="let item of order.products">
                <div class="item-image" *ngIf="item.Product?.photo">
                  <img [src]="item.Product?.photo" alt="">
                </div>
                <div class="item-info">
                  <span class="item-name">{{ item.Product?.name || 'Produit #' + item.productId }}</span>
                  <span class="item-meta">{{ item.quantity }} x {{ item.unitPrice | number }} FCFA</span>
                </div>
                <span class="item-total">{{ item.totalPrice | number }} FCFA</span>
              </div>
            </div>
            <div class="order-totals">
              <div class="total-row"><span>Sous-total</span><span>{{ order.subtotal | number }} FCFA</span></div>
              <div class="total-row" *ngIf="order.tax > 0"><span>Taxe</span><span>{{ order.tax | number }} FCFA</span></div>
              <div class="total-row" *ngIf="order.discount > 0"><span>Remise</span><span>-{{ order.discount | number }} FCFA</span></div>
              <div class="total-row grand-total"><span>Total</span><span>{{ order.totalAmount | number }} FCFA</span></div>
              <div class="total-row paid"><span>Payé</span><span>{{ order.paidAmount | number }} FCFA</span></div>
            </div>
          </div>

          <div class="detail-card">
            <h3>Client</h3>
            <div class="info-row"><span class="info-label">Nom</span><span>{{ order.Customer?.name || '—' }}</span></div>
            <div class="info-row"><span class="info-label">Email</span><span>{{ order.Customer?.email || '—' }}</span></div>
            <div class="info-row"><span class="info-label">Téléphone</span><span>{{ order.Customer?.phone || '—' }}</span></div>
            <div class="info-row"><span class="info-label">Adresse livraison</span><span>{{ order.deliveryAddress || 'Non renseignée' }}</span></div>
            <div class="info-row"><span class="info-label">Paiement</span><span>{{ getPaymentLabel(order.paymentMethod) }}</span></div>
          </div>
        </div>
      </ng-container>

      <div *ngIf="!loading && !order" class="not-found">
        <p>Commande introuvable.</p>
        <a routerLink="/client/dashboard">Retour au tableau de bord</a>
      </div>
    </div>
  `,
  styles: [`
    .order-detail-container { max-width: 1000px; margin: 0 auto; padding: 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    .back-link a { color: #667eea; text-decoration: none; font-size: 14px; display: inline-block; margin-bottom: 20px; }
    .back-link a:hover { text-decoration: underline; }
    .loading { text-align: center; padding: 60px; color: #666; font-size: 18px; }
    .not-found { text-align: center; padding: 60px; color: #666; }
    .not-found a { color: #667eea; }
    .order-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; flex-wrap: wrap; gap: 10px; }
    .order-header h1 { margin: 0; font-size: 24px; color: #1a1a2e; }
    .order-date { color: #666; font-size: 14px; }
    .status-badge { padding: 6px 16px; border-radius: 20px; font-size: 13px; font-weight: 600; text-transform: uppercase; }
    .status-pending { background: #fff3cd; color: #856404; }
    .status-paid { background: #d4edda; color: #155724; }
    .status-partially_paid { background: #cce5ff; color: #004085; }
    .status-shipped { background: #d1ecf1; color: #0c5460; }
    .status-delivered { background: #d4edda; color: #155724; }
    .status-cancelled { background: #f8d7da; color: #721c24; }
    .btn-invoice { display: inline-block; padding: 10px 20px; background: #667eea; color: white; border: none; border-radius: 8px; font-size: 14px; cursor: pointer; margin-bottom: 20px; }
    .btn-invoice:hover { background: #5a67d8; }

    .timeline { display: flex; align-items: flex-start; gap: 0; margin-bottom: 40px; padding: 30px 20px; background: white; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); overflow-x: auto; }
    .timeline-step { display: flex; align-items: flex-start; gap: 12px; flex: 1; min-width: 120px; position: relative; }
    .step-marker { display: flex; flex-direction: column; align-items: center; min-width: 40px; position: relative; }
    .step-icon { width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 16px; background: #e9ecef; border: 3px solid #dee2e6; transition: all 0.3s; }
    .timeline-step.active .step-icon { background: #667eea; border-color: #667eea; box-shadow: 0 0 0 4px rgba(102,126,234,0.2); }
    .timeline-step.current .step-icon { animation: pulse 1.5s infinite; }
    @keyframes pulse { 0%, 100% { box-shadow: 0 0 0 4px rgba(102,126,234,0.2); } 50% { box-shadow: 0 0 0 8px rgba(102,126,234,0.1); } }
    .step-line { width: 2px; height: 40px; background: #dee2e6; margin-top: 4px; }
    .timeline-step.active .step-line { background: #667eea; }
    .step-content { display: flex; flex-direction: column; gap: 4px; padding-top: 6px; }
    .step-label { font-size: 13px; font-weight: 600; color: #adb5bd; white-space: nowrap; }
    .timeline-step.active .step-label { color: #1a1a2e; }
    .timeline-step.current .step-label { color: #667eea; }
    .step-date { font-size: 11px; color: #adb5bd; }
    .timeline-done { display: flex; align-items: flex-start; gap: 12px; min-width: 100px; }
    .timeline-done .step-icon { background: #22c55e; border-color: #22c55e; }
    .timeline-done .step-label { color: #22c55e; }

    .timeline.cancelled { justify-content: center; }
    .cancelled-step .step-icon { background: #ef4444; border-color: #ef4444; }
    .cancelled-step .step-label { color: #ef4444; font-size: 16px; }

    .detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 40px; }
    @media (max-width: 768px) { .detail-grid { grid-template-columns: 1fr; } }
    .detail-card { background: white; padding: 24px; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
    .detail-card h3 { margin: 0 0 16px; font-size: 16px; color: #1a1a2e; }
    .order-items { display: flex; flex-direction: column; gap: 12px; margin-bottom: 16px; }
    .order-item { display: flex; align-items: center; gap: 12px; padding: 8px 0; border-bottom: 1px solid #f1f5f9; }
    .item-image { width: 48px; height: 48px; border-radius: 8px; overflow: hidden; flex-shrink: 0; }
    .item-image img { width: 100%; height: 100%; object-fit: cover; }
    .item-info { flex: 1; display: flex; flex-direction: column; gap: 2px; }
    .item-name { font-weight: 500; font-size: 14px; color: #1a1a2e; }
    .item-meta { font-size: 12px; color: #94a3b8; }
    .item-total { font-weight: 600; font-size: 14px; color: #1a1a2e; white-space: nowrap; }

    .order-totals { border-top: 2px solid #f1f5f9; padding-top: 12px; }
    .total-row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 14px; color: #475569; }
    .grand-total { font-weight: 700; font-size: 16px; color: #1a1a2e; border-top: 1px solid #e2e8f0; padding-top: 8px; margin-top: 4px; }
    .paid { color: #22c55e; font-weight: 600; }

    .info-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f1f5f9; font-size: 14px; }
    .info-label { font-weight: 500; color: #94a3b8; }
    .info-row span:last-child { color: #1a1a2e; text-align: right; max-width: 60%; }
  `]
})
export class OrderDetailComponent implements OnInit {
  order: Order | null = null;
  loading = true;
  timelineSteps = TIMELINE_STEPS;
  currentStepIndex = 0;
  orderDates: (string | null)[] = [null, null, null, null];
  paymentLabels: Record<string, string> = {};

  constructor(private route: ActivatedRoute, private http: HttpClient, private configService: ConfigService, private pdfService: PdfService) {}

  ngOnInit() {
    this.configService.getPaymentMethods().subscribe(config => {
      config.methods.forEach(m => { this.paymentLabels[m.key] = m.name; });
    });
    const id = this.route.snapshot.paramMap.get('id');
    if (id) this.loadOrder(id);
    else this.loading = false;
  }

  private loadOrder(id: string) {
    this.http.get<Order>(`${environment.apiUrl}/api/orders/${id}`).subscribe({
      next: (data) => {
        this.order = data;
        this.computeTimeline();
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  private computeTimeline() {
    if (!this.order) return;
    const idx = STATUS_ORDER[this.order.status] ?? -1;
    this.currentStepIndex = Math.max(0, idx);
    if (idx >= 0 && this.order?.createdAt) {
      this.orderDates[0] = this.formatDate(this.order.createdAt);
    }
  }

  private formatDate(d: string): string {
    return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      pending: 'En attente', paid: 'Payée', partially_paid: 'Partiellement payée',
      shipped: 'Expédiée', delivered: 'Livrée', cancelled: 'Annulée'
    };
    return labels[status] || status;
  }

  getPaymentLabel(method: string): string {
    return this.paymentLabels[method] || method;
  }

  downloadInvoice() {
    if (!this.order) return;
    this.pdfService.generateReceipt({
      orderNumber: this.order.orderNumber,
      paymentMethod: this.getPaymentLabel(this.order.paymentMethod),
      subtotal: this.order.subtotal,
      discount: this.order.discount,
      tax: this.order.tax,
      totalAmount: this.order.totalAmount,
      items: (this.order.products || []).map(item => ({
        productName: item.Product?.name || 'Produit #' + item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice
      }))
    });
  }
}
