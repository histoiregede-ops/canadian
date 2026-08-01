import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { PurchaseOrderService, PurchaseOrder, PurchaseOrderItem } from '../../services/purchase-order';
import { SupplierService, Supplier } from '../../services/supplier';
import { PurchaseOrdersResolved } from '../../resolvers/purchase-orders.resolver';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-purchase-orders',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div>
          <h1 class="page-title">Commandes Fournisseurs</h1>
          <p class="page-subtitle">Gestion des approvisionnements et relances</p>
        </div>
        <button class="btn btn-primary" (click)="openCreateModal()">➕ Nouvelle commande</button>
      </div>

      <!-- Tabs -->
      <div class="tabs">
        <button class="tab" [class.active]="tab === 'all'" (click)="selectTab('all')">
          📋 Toutes ({{ allOrders.length }})
        </button>
        <button class="tab" [class.active]="tab === 'overdue'" (click)="selectTab('overdue')">
          ⚠️ En retard ({{ overdueOrders.length }})
        </button>
        <button class="tab" [class.active]="tab === 'received'" (click)="selectTab('received')">
          ✅ Reçues ({{ receivedCount() }})
        </button>
      </div>

      <div class="loading-state" *ngIf="loading">
        <div class="spinner"></div>
        <p>Chargement...</p>
      </div>

      <!-- Empty -->
      <div class="empty-state" *ngIf="!loading && displayedOrders.length === 0">
        <span class="empty-icon">{{ tab === 'overdue' ? '🎉' : '📦' }}</span>
        <h3 class="empty-title">
          {{ tab === 'overdue' ? 'Aucune commande en retard' : tab === 'received' ? 'Aucune commande reçue' : 'Aucune commande' }}
        </h3>
      </div>

      <!-- Orders List -->
      <div class="po-grid" *ngIf="!loading && displayedOrders.length > 0">
        <div class="card po-card" *ngFor="let order of displayedOrders; trackBy: trackByOrderId" [class]="'status-' + order.status">
          <div class="card-body">
            <div class="po-header">
              <div>
                <span class="po-number">{{ order.orderNumber }}</span>
                <span class="po-supplier">{{ order.Supplier?.name || '—' }}</span>
              </div>
              <span class="badge" [class]="'badge-' + order.status">{{ statusLabel(order.status) }}</span>
            </div>

            <div class="po-details">
              <div class="detail-row">
                <span>Date commande</span>
                <span>{{ order.orderDate | date:'dd MMM yyyy' }}</span>
              </div>
              <div class="detail-row" *ngIf="order.expectedDate">
                <span>Livraison prévue</span>
                <span [class.overdue]="isOverdue(order)">{{ order.expectedDate | date:'dd MMM yyyy' }}</span>
              </div>
              <div class="detail-row" *ngIf="order.receivedDate">
                <span>Reçue le</span>
                <span>{{ order.receivedDate | date:'dd MMM yyyy' }}</span>
              </div>
              <div class="detail-row">
                <span>Articles</span>
                <span>{{ order.items.length }} produit(s)</span>
              </div>
              <div class="divider"></div>
              <div class="detail-row total">
                <span>Total</span>
                <span class="amount">{{ order.totalAmount | number }} FCFA</span>
              </div>
            </div>

            <div class="po-items" *ngIf="order.items.length > 0">
              <div class="po-item" *ngFor="let item of order.items; trackBy: trackByItemName">
                <span class="item-name">{{ item.productName }}</span>
                <span class="item-qty">
                  Reçu: {{ item.receivedQuantity }}/{{ item.quantity }}
                </span>
              </div>
            </div>

            <div class="card-actions">
              <ng-container *ngIf="order.status === 'pending' || order.status === 'confirmed' || order.status === 'partial'">
                <button class="btn btn-success btn-sm" (click)="openReceiveModal(order)">
                  📥 Réceptionner
                </button>
                <button class="btn btn-warning btn-sm" (click)="sendReminder(order)" *ngIf="isOverdue(order)">
                  💬 Relancer
                </button>
              </ng-container>
              <button class="btn btn-outline btn-sm" (click)="openEditModal(order)">✏️</button>
              <button class="btn btn-danger btn-sm" (click)="deleteOrder(order)">🗑️</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Create/Edit Modal -->
    <div class="modal-overlay" *ngIf="showModal">
      <div class="modal-card modal-lg">
        <div class="modal-header">
          <h2>{{ isEditing ? '✏️ Modifier' : '➕ Nouvelle commande fournisseur' }}</h2>
          <button class="modal-close" (click)="showModal = false">×</button>
        </div>
        <div class="modal-body">
          <form (ngSubmit)="saveOrder($event)" class="form">
              <div class="form-group">
                <label class="form-label">Fournisseur *</label>
                <select [(ngModel)]="form.supplierId" name="supplierId" required class="form-select">
                  <option value="">Sélectionner</option>
                  <option *ngFor="let s of suppliers; trackBy: trackBySupplierId" [value]="s.id">{{ s.name }}</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Date livraison prévue</label>
                <input type="date" [(ngModel)]="form.expectedDate" name="expectedDate" class="form-input" />
              </div>

            <div class="form-group">
              <label class="form-label">Notes</label>
              <textarea [(ngModel)]="form.notes" name="notes" class="form-input" rows="2"></textarea>
            </div>

            <div class="form-section">
              <div class="form-section-header">
                <h4>Articles</h4>
                <button type="button" class="btn btn-outline btn-sm" (click)="addItem()">+ Ajouter</button>
              </div>
              <div class="item-line" *ngFor="let item of form.items; let i = index; trackBy: trackByFormItemIndex">
                <input type="text" [(ngModel)]="item.productName" [name]="'name_' + i" placeholder="Nom du produit" class="form-input" required />
                <input type="number" [(ngModel)]="item.quantity" [name]="'qty_' + i" placeholder="Qté" class="form-input item-qty-input" min="1" required />
                <input type="number" [(ngModel)]="item.unitPrice" [name]="'price_' + i" placeholder="Prix unitaire" class="form-input item-price-input" min="0" required />
                <button type="button" class="btn btn-danger btn-sm" (click)="removeItem(i)" *ngIf="form.items.length > 1">×</button>
              </div>
              <div class="item-total" *ngIf="form.items.length > 0">
                <span>Total estimé: <strong>{{ computeTotal() | number }} FCFA</strong></span>
              </div>
            </div>

            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" (click)="showModal = false">Annuler</button>
              <button type="submit" class="btn btn-primary">{{ isEditing ? 'Mettre à jour' : 'Créer la commande' }}</button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <!-- Receive Modal -->
    <div class="modal-overlay" *ngIf="showReceiveModal && receiveOrder">
      <div class="modal-card">
        <div class="modal-header">
          <h2>📥 Réceptionner — {{ receiveOrder.orderNumber }}</h2>
          <button class="modal-close" (click)="showReceiveModal = false">×</button>
        </div>
        <div class="modal-body">
          <p style="font-size:13px; color:var(--text-muted); margin-bottom:16px;">Saisissez les quantités reçues pour chaque article.</p>
          <div class="receive-item" *ngFor="let item of receiveItems; let i = index; trackBy: trackByReceiveItemIndex">
            <div class="receive-item-info">
              <span class="fw-600">{{ item.productName }}</span>
              <span class="text-muted">Commandé: {{ item.quantity }}</span>
            </div>
            <input type="number" [(ngModel)]="item.receivedQuantity" [name]="'rec_' + i"
              class="form-input receive-input" min="0" [max]="item.quantity" />
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" (click)="showReceiveModal = false">Annuler</button>
            <button class="btn btn-success" (click)="confirmReceive()">✅ Confirmer la réception</button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .page-container { padding: 24px; }
    .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
    .page-title { margin: 0; font-size: 22px; font-weight: 700; }
    .page-subtitle { margin: 4px 0 0; color: var(--text-muted); font-size: 14px; }

    .tabs { display: flex; gap: 4px; margin-bottom: 24px; background: var(--surface); border-radius: var(--radius-lg); padding: 4px; border: 1px solid var(--border); }
    .tab { padding: 10px 20px; border: none; background: transparent; border-radius: var(--radius-md); cursor: pointer; font-size: 13px; font-weight: 600; transition: all 0.2s; }
    .tab.active { background: var(--primary); color: #fff; }
    .tab:hover:not(.active) { background: var(--primary-bg); }

    .po-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(380px, 1fr)); gap: 16px; }

    .po-card { transition: all 0.2s; }
    .po-card:hover { transform: translateY(-2px); box-shadow: var(--shadow-md); }
    .po-card.status-cancelled { opacity: 0.5; }
    .po-card.status-received { border-left: 4px solid var(--success); }

    .po-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; }
    .po-number { font-weight: 700; font-size: 15px; display: block; }
    .po-supplier { font-size: 12px; color: var(--text-muted); }

    .badge { padding: 3px 10px; border-radius: 12px; font-size: 11px; font-weight: 600; }
    .badge-pending { background: #fff3cd; color: #856404; }
    .badge-confirmed { background: #cce5ff; color: #004085; }
    .badge-partial { background: #fef3c7; color: #92400e; }
    .badge-received { background: #d4edda; color: #155724; }
    .badge-cancelled { background: #f8d7da; color: #721c24; }

    .po-details { display: flex; flex-direction: column; gap: 4px; font-size: 13px; margin-bottom: 12px; }
    .detail-row { display: flex; justify-content: space-between; }
    .detail-row .overdue { color: var(--danger); font-weight: 600; }
    .divider { height: 1px; background: var(--border-light); margin: 6px 0; }
    .total .amount { font-weight: 800; font-size: 16px; color: var(--primary); }

    .po-items { margin-bottom: 12px; }
    .po-item { display: flex; justify-content: space-between; padding: 4px 8px; background: var(--bg-color); border-radius: var(--radius-sm); margin-bottom: 4px; font-size: 12px; }
    .item-name { font-weight: 500; }
    .item-qty { color: var(--text-muted); }

    .card-actions { display: flex; gap: 8px; flex-wrap: wrap; }

    /* Modal */
    .modal-lg { width: 640px; max-width: 95vw; }
    .form-section { margin-top: 16px; }
    .form-section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
    .form-section-header h4 { margin: 0; font-size: 14px; }
    .item-line { display: flex; gap: 8px; align-items: center; margin-bottom: 8px; }
    .item-qty-input { width: 70px; }
    .item-price-input { width: 120px; }
    .item-total { text-align: right; font-size: 14px; margin-top: 8px; padding-top: 8px; border-top: 1px solid var(--border-light); }

    .receive-item { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 8px 0; border-bottom: 1px solid var(--border-light); }
    .receive-item-info { display: flex; flex-direction: column; gap: 2px; }
    .receive-input { width: 80px; text-align: center; }

    .loading-state, .empty-state { text-align: center; padding: 60px; }
    .empty-icon { font-size: 48px; display: block; margin-bottom: 12px; }

    @media (max-width: 768px) {
      .po-grid { grid-template-columns: 1fr; }
      .tabs { flex-direction: column; }
      .item-line { flex-wrap: wrap; }
      .modal-lg { width: 100%; }
    }
  `]
})
export class PurchaseOrdersComponent implements OnInit {
  allOrders: PurchaseOrder[] = [];
  overdueOrders: PurchaseOrder[] = [];
  suppliers: Supplier[] = [];
  loading = true;
  tab: 'all' | 'overdue' | 'received' = 'all';

  showModal = false;
  isEditing = false;
  editingId: string | null = null;
  form: { supplierId: number | null; expectedDate: string; notes: string; items: PurchaseOrderItem[] } = this.emptyForm();

  showReceiveModal = false;
  receiveOrder: PurchaseOrder | null = null;
  receiveItems: PurchaseOrderItem[] = [];

  trackByOrderId(index: number, item: any): string {
    return item?.id ?? index;
  }

  trackByItemName(index: number, item: any): string {
    return item?.productName ?? index;
  }

  trackBySupplierId(index: number, item: any): string {
    return item?.id ?? index;
  }

  trackByFormItemIndex(index: number): number {
    return index;
  }

  trackByReceiveItemIndex(index: number): number {
    return index;
  }

  constructor(
    private poService: PurchaseOrderService,
    private supplierService: SupplierService,
    private route: ActivatedRoute,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    const resolved = this.route.snapshot.data['data'] as PurchaseOrdersResolved;
    this.allOrders = resolved?.allOrders || [];
    this.overdueOrders = resolved?.overdueOrders || [];
    this.suppliers = resolved?.suppliers || [];
    this.loading = false;
  }

  selectTab(t: 'all' | 'overdue' | 'received'): void {
    this.tab = t;
    if (t === 'overdue') {
      this.loadOverdue();
    }
  }

  get displayedOrders(): PurchaseOrder[] {
    switch (this.tab) {
      case 'overdue': return this.overdueOrders;
      case 'received': return this.allOrders.filter(o => o.status === 'received');
      default: return this.allOrders;
    }
  }

  private loadAll(callback?: () => void): void {
    this.loading = true;
    this.poService.getOrders().subscribe({
      next: (data) => { this.allOrders = data; this.loading = false; callback?.(); },
      error: (err) => { 
        console.error('Failed to load purchase orders:', err); 
        this.allOrders = []; 
        this.loading = false; 
        callback?.();
      }
    });
  }

  receivedCount(): number {
    return this.allOrders.filter(o => o.status === 'received').length;
  }

  loadOverdue(): void {
    this.loading = true;
    this.poService.getOverdue().subscribe({
      next: (data) => { this.overdueOrders = data; this.loading = false; },
      error: (err) => { 
        console.error('Failed to load overdue orders:', err); 
        this.overdueOrders = []; 
        this.loading = false; 
      }
    });
  }

  statusLabel(s: string): string {
    const labels: Record<string, string> = { pending: 'En attente', confirmed: 'Confirmée', partial: 'Partielle', received: 'Reçue', cancelled: 'Annulée' };
    return labels[s] || s;
  }

  isOverdue(o: PurchaseOrder): boolean {
    if (!o.expectedDate || o.status === 'received' || o.status === 'cancelled') return false;
    return new Date(o.expectedDate) < new Date();
  }

  private emptyForm() {
    return { supplierId: null, expectedDate: '', notes: '', items: [{ productName: '', quantity: 1, unitPrice: 0, receivedQuantity: 0 }] };
  }

  openCreateModal(): void {
    this.isEditing = false;
    this.editingId = null;
    this.form = this.emptyForm();
    this.showModal = true;
  }

  openEditModal(o: PurchaseOrder): void {
    this.isEditing = true;
    this.editingId = o.id!;
    this.form = {
      supplierId: o.supplierId,
      expectedDate: o.expectedDate ? o.expectedDate.split('T')[0] : '',
      notes: o.notes || '',
      items: o.items.map(i => ({ ...i }))
    };
    this.showModal = true;
  }

  addItem(): void {
    this.form.items.push({ productName: '', quantity: 1, unitPrice: 0, receivedQuantity: 0 });
  }

  removeItem(i: number): void {
    this.form.items.splice(i, 1);
  }

  computeTotal(): number {
    return this.form.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  }

  saveOrder(event?: Event): void {
    event?.preventDefault();
    const payload = {
      supplierId: this.form.supplierId ?? undefined,
      expectedDate: this.form.expectedDate || undefined,
      notes: this.form.notes || undefined,
      totalAmount: this.computeTotal(),
      items: this.form.items.map(i => ({ ...i, receivedQuantity: 0 }))
    };

    const action = this.isEditing && this.editingId
      ? this.poService.updateOrder(this.editingId, payload)
      : this.poService.createOrder(payload);

    action.subscribe({
      next: () => {
        this.showModal = false;
        this.loadAll(() => this.toastService.show('Commande enregistrée', 'success'));
      },
      error: (err) => this.toastService.show(err.error?.error || 'Erreur lors de la sauvegarde', 'error')
    });
  }

  deleteOrder(o: PurchaseOrder): void {
    if (!confirm(`Supprimer la commande ${o.orderNumber} ?`)) return;
    this.poService.deleteOrder(o.id!).subscribe({
      next: () => {
        this.loadAll(() => this.toastService.show('Commande supprimée', 'success'));
      },
      error: (err) => this.toastService.show(err.error?.error || 'Erreur', 'error')
    });
  }

  openReceiveModal(o: PurchaseOrder): void {
    this.receiveOrder = o;
    this.receiveItems = o.items.map(i => ({ ...i }));
    this.showReceiveModal = true;
  }

  confirmReceive(): void {
    if (!this.receiveOrder) return;
    this.poService.receiveOrder(this.receiveOrder.id!, this.receiveItems).subscribe({
      next: () => {
        this.showReceiveModal = false;
        this.loadAll(() => this.toastService.show('Commande reçue', 'success'));
      },
      error: (err) => this.toastService.show(err.error?.error || 'Erreur lors de la réception', 'error')
    });
  }

  sendReminder(o: PurchaseOrder): void {
    this.poService.sendReminder(o.id!).subscribe({
      next: (res) => {
        if (res.whatsappLink) {
          window.open(res.whatsappLink, '_blank');
        }
        this.loadAll(() => this.toastService.show('Relance envoyée', 'success'));
      },
      error: (err) => this.toastService.show(err.error?.error || 'Erreur lors de la relance', 'error')
    });
  }
}
