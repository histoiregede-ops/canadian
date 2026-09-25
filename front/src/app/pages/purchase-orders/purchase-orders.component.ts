import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { PurchaseOrderService, PurchaseOrder, PurchaseOrderItem } from '../../services/purchase-order';
import { SupplierService, Supplier } from '../../services/supplier';
import { PurchaseOrdersResolved } from '../../resolvers/purchase-orders.resolver';
import { ToastService } from '../../services/toast.service';
import { finalize } from 'rxjs/operators';

@Component({
  selector: 'app-purchase-orders',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="po-page">
      <!-- ===== HERO ===== -->
      <header class="po-hero">
        <div class="hero-glow"></div>
        <div class="hero-content">
          <div class="hero-left">
            <div class="hero-eyebrow">
              <span class="eyebrow-dot"></span>
              <span>Approvisionnement • Temps réel</span>
              <span class="eyebrow-separator">•</span>
              <span class="live-indicator"><i></i> Live</span>
            </div>
            <h1 class="hero-title">
              Commandes
              <span class="hero-title-accent">Fournisseurs</span>
            </h1>
            <p class="hero-subtitle">
              Pilotez vos approvisionnements — <strong>{{ allOrders.length }} commandes</strong> • {{ overdueOrders.length }} en retard • {{ receivedCount() }} reçues
            </p>
          </div>
          <div class="hero-actions">
            <button class="btn btn-ghost btn-sm" (click)="tab='all'; loadOverdue()"><span class="btn-icon">↻</span> Actualiser</button>
            <button class="btn btn-primary" (click)="openCreateModal()">＋ Nouvelle commande</button>
          </div>
        </div>
      </header>

      <!-- ===== KPI ===== -->
      <section class="po-metrics">
        <article class="metric-card" (click)="selectTab('all')" style="cursor:pointer">
          <div class="metric-top">
            <div class="metric-icon"><span>◫</span></div>
            <span class="metric-trend" [class.active]="tab==='all'">Toutes</span>
          </div>
          <p class="metric-label">Total commandes</p>
          <p class="metric-value">{{ allOrders.length }}<span>commandes</span></p>
          <div class="metric-bar"><i style="width:74%"></i></div>
          <p class="metric-foot"><span class="dot dot-accent"></span> {{ suppliers.length }} fournisseurs actifs</p>
        </article>
        <article class="metric-card" (click)="selectTab('overdue')" style="cursor:pointer">
          <div class="metric-top">
            <div class="metric-icon metric-icon--danger"><span>⚑</span></div>
            <span class="metric-trend negative" *ngIf="overdueOrders.length>0">{{ overdueOrders.length }} critique</span>
            <span class="metric-trend" *ngIf="overdueOrders.length===0">OK</span>
          </div>
          <p class="metric-label">En retard</p>
          <p class="metric-value">{{ overdueOrders.length }}<span>en retard</span></p>
          <div class="metric-bar"><i [style.width.%]="allOrders.length ? (overdueOrders.length / allOrders.length * 100) : 0"></i></div>
          <p class="metric-foot"><span class="dot dot-danger"></span> Relance prioritaire</p>
        </article>
        <article class="metric-card" (click)="selectTab('received')" style="cursor:pointer">
          <div class="metric-top">
            <div class="metric-icon metric-icon--success"><span>✓</span></div>
            <span class="metric-trend positive">{{ receivedCount() }} validées</span>
          </div>
          <p class="metric-label">Reçues</p>
          <p class="metric-value">{{ receivedCount() }}<span>réceptions</span></p>
          <div class="metric-bar"><i [style.width.%]="allOrders.length ? (receivedCount() / allOrders.length * 100) : 0"></i></div>
          <p class="metric-foot"><span class="dot dot-success"></span> Stock à jour</p>
        </article>
        <article class="metric-card">
          <div class="metric-top">
            <div class="metric-icon metric-icon--warm"><span>⬡</span></div>
            <span class="metric-trend">{{ suppliers.length }} • partenaires</span>
          </div>
          <p class="metric-label">Fournisseurs</p>
          <p class="metric-value">{{ suppliers.length }}<span>partenaires</span></p>
          <div class="metric-bar"><i style="width:46%"></i></div>
          <p class="metric-foot"><span class="dot dot-warning"></span> Réseau actif</p>
        </article>
      </section>

      <!-- ===== TOOLBAR TABS ===== -->
      <section class="po-toolbar">
        <div class="toolbar-left">
          <h2 class="toolbar-title">Approvisionnements</h2>
          <span class="toolbar-count">{{ displayedOrders.length }} affichées • {{ allOrders.length }} totales</span>
        </div>
        <div class="tabs">
          <button class="tab" [class.active]="tab === 'all'" (click)="selectTab('all')">
            Toutes <span class="tab-count">{{ allOrders.length }}</span>
          </button>
          <button class="tab" [class.active]="tab === 'overdue'" (click)="selectTab('overdue')">
            En retard <span class="tab-count">{{ overdueOrders.length }}</span>
          </button>
          <button class="tab" [class.active]="tab === 'received'" (click)="selectTab('received')">
            Reçues <span class="tab-count">{{ receivedCount() }}</span>
          </button>
        </div>
      </section>

      <!-- States -->
      <div class="state state-loading" *ngIf="loading">
        <div class="loader"></div>
        <div class="loader-text">
          <p>Chargement des commandes…</p>
          <span>Synchronisation fournisseurs</span>
        </div>
      </div>

      <div class="state state-empty" *ngIf="!loading && displayedOrders.length === 0">
        <div class="empty-illus">
          <div class="empty-orb"></div>
          <span class="empty-emoji">{{ tab === 'overdue' ? '✦' : '◫' }}</span>
        </div>
        <h3>
          {{ tab === 'overdue' ? 'Aucune commande en retard' : tab === 'received' ? 'Aucune commande reçue' : 'Aucune commande' }}
        </h3>
        <p>Les commandes fournisseurs apparaîtront ici. Créez votre première demande.</p>
        <button *ngIf="tab==='all'" class="btn btn-primary btn-sm" (click)="openCreateModal()" style="margin-top:12px">＋ Créer une commande</button>
      </div>

      <!-- Orders Grid -->
      <div class="po-grid" *ngIf="!loading && displayedOrders.length > 0">
        <article class="po-card" *ngFor="let order of displayedOrders; trackBy: trackByOrderId" [class]="'status-' + order.status">
          <div class="po-card-head">
            <div class="po-head-left">
              <span class="po-number">{{ order.orderNumber }}</span>
              <span class="po-supplier">{{ order.Supplier?.name || '—' }} • {{ order.supplierId ? 'ID ' + order.supplierId : '' }}</span>
            </div>
            <span class="status-pill" [class]="'status-' + order.status">{{ statusLabel(order.status) }}</span>
          </div>

          <div class="po-details">
            <div class="detail-row">
              <span class="detail-label">Date commande</span>
              <span class="detail-value">{{ order.orderDate | date:'dd MMM yyyy' }}</span>
            </div>
            <div class="detail-row" *ngIf="order.expectedDate">
              <span class="detail-label">Livraison prévue</span>
              <span class="detail-value" [class.overdue]="isOverdue(order)">{{ order.expectedDate | date:'dd MMM yyyy' }}</span>
            </div>
            <div class="detail-row" *ngIf="order.receivedDate">
              <span class="detail-label">Reçue le</span>
              <span class="detail-value success">{{ order.receivedDate | date:'dd MMM yyyy' }}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Articles</span>
              <span class="detail-value strong">{{ order.items.length }} produit(s)</span>
            </div>
            <div class="divider"></div>
            <div class="detail-row total">
              <span class="detail-label">Total</span>
              <span class="detail-value amount">{{ order.totalAmount | number }} FCFA</span>
            </div>
          </div>

          <div class="po-items" *ngIf="order.items.length > 0">
            <div class="po-item" *ngFor="let item of order.items; trackBy: trackByItemName">
              <span class="item-name">{{ item.productName }}</span>
              <span class="item-qty" [class.done]="item.receivedQuantity===item.quantity">
                {{ item.receivedQuantity }}/{{ item.quantity }} reçus
              </span>
            </div>
          </div>

          <div class="po-actions">
            <ng-container *ngIf="order.status === 'pending' || order.status === 'confirmed' || order.status === 'partial'">
              <button class="btn btn-primary btn-sm" (click)="openReceiveModal(order)">
                Réceptionner
              </button>
              <button class="btn btn-secondary btn-sm" (click)="sendReminder(order)" *ngIf="isOverdue(order)" [disabled]="remindingId === order.id">
                {{ remindingId === order.id ? '…' : 'Relancer' }}
              </button>
            </ng-container>
            <button class="btn btn-ghost btn-sm" (click)="openEditModal(order)">✎ Éditer</button>
            <button class="btn btn-ghost btn-sm" style="color:var(--danger)" (click)="deleteOrder(order)" [disabled]="deletingId === order.id">⌫</button>
          </div>
        </article>
      </div>
    </div>

    <!-- Create/Edit Modal -->
    <div class="modal-overlay" *ngIf="showModal" (click)="showModal=false">
      <div class="modal-card modal-premium modal-lg" (click)="$event.stopPropagation()">
        <div class="modal-glow"></div>
        <div class="modal-header">
          <div class="modal-header-left">
            <div class="modal-icon"><span>{{ isEditing ? '✎' : '＋' }}</span></div>
            <div>
              <h2 class="modal-title">{{ isEditing ? 'Modifier la commande' : 'Nouvelle commande fournisseur' }}</h2>
              <p class="modal-subtitle">{{ isEditing ? 'Corrigez les informations et mettez à jour' : 'Créez une demande d’approvisionnement — suivi premium' }}</p>
            </div>
          </div>
          <button class="modal-close" (click)="showModal = false">×</button>
        </div>
        <div class="modal-body">
          <form (ngSubmit)="saveOrder($event)" class="form">
            <div class="field-grid">
              <div class="field">
                <label class="field-label">Fournisseur <span class="req">*</span></label>
                <select [(ngModel)]="form.supplierId" name="supplierId" required class="form-select">
                  <option value="">Sélectionner</option>
                  <option *ngFor="let s of suppliers; trackBy: trackBySupplierId" [value]="s.id">{{ s.name }}</option>
                </select>
              </div>
              <div class="field">
                <label class="field-label">Livraison prévue</label>
                <input type="date" [(ngModel)]="form.expectedDate" name="expectedDate" class="form-input" />
              </div>
            </div>

            <div class="field">
              <label class="field-label">Notes</label>
              <textarea [(ngModel)]="form.notes" name="notes" class="form-textarea" rows="2" placeholder="Conditions, priorités, contact..."></textarea>
            </div>

            <div class="form-section">
              <div class="form-section-header">
                <h4>Articles • {{ form.items.length }}</h4>
                <button type="button" class="btn btn-secondary btn-sm" (click)="addItem()">＋ Ajouter</button>
              </div>
              <div class="item-line" *ngFor="let item of form.items; let i = index; trackBy: trackByFormItemIndex">
                <input type="text" [(ngModel)]="item.productName" [name]="'name_' + i" placeholder="Nom du produit" class="form-input" required />
                <input type="number" [(ngModel)]="item.quantity" [name]="'qty_' + i" placeholder="Qté" class="form-input item-qty-input" min="1" required />
                <input type="number" [(ngModel)]="item.unitPrice" [name]="'price_' + i" placeholder="Prix unitaire" class="form-input item-price-input" min="0" required />
                <button type="button" class="btn btn-ghost btn-sm" style="color:var(--danger)" (click)="removeItem(i)" *ngIf="form.items.length > 1">×</button>
              </div>
              <div class="item-total">
                <span>Total estimé : <strong>{{ computeTotal() | number }} FCFA</strong></span>
              </div>
            </div>

            <div class="modal-footer premium">
              <button type="button" class="btn btn-secondary" (click)="showModal = false">Annuler</button>
              <button type="submit" class="btn btn-primary" [disabled]="saving">
                <span *ngIf="!saving" class="btn-loading"><span>{{ isEditing ? 'Mettre à jour' : 'Créer la commande' }}</span> <span>→</span></span>
                <span *ngIf="saving" class="btn-loading"><span class="mini-loader"></span> Enregistrement…</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <!-- Receive Modal -->
    <div class="modal-overlay" *ngIf="showReceiveModal && receiveOrder" (click)="showReceiveModal=false">
      <div class="modal-card modal-premium" (click)="$event.stopPropagation()">
        <div class="modal-glow"></div>
        <div class="modal-header">
          <div class="modal-header-left">
            <div class="modal-icon"><span>✓</span></div>
            <div>
              <h2 class="modal-title">Réceptionner — {{ receiveOrder.orderNumber }}</h2>
              <p class="modal-subtitle">Saisissez les quantités reçues pour chaque article</p>
            </div>
          </div>
          <button class="modal-close" (click)="showReceiveModal = false">×</button>
        </div>
        <div class="modal-body">
          <div class="receive-list">
            <div class="receive-item" *ngFor="let item of receiveItems; let i = index; trackBy: trackByReceiveItemIndex">
              <div class="receive-info">
                <strong>{{ item.productName }}</strong>
                <span class="muted">Commandé : {{ item.quantity }}</span>
              </div>
              <input type="number" [(ngModel)]="item.receivedQuantity" [name]="'rec_' + i" class="form-input receive-input" min="0" [max]="item.quantity" />
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" (click)="showReceiveModal = false">Annuler</button>
            <button type="button" class="btn btn-primary" (click)="confirmReceive()" [disabled]="receivingId === receiveOrder?.id">
              <span *ngIf="receivingId !== receiveOrder?.id">Confirmer la réception →</span>
              <span *ngIf="receivingId === receiveOrder?.id" class="btn-loading"><span class="mini-loader"></span> Réception…</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .po-page{ --po-max:1440px; display:grid; gap:24px; max-width:var(--po-max); margin:0 auto; padding:24px; background:var(--bg-color); min-height:100vh; }
    .po-hero{ position:relative; overflow:hidden; background:var(--surface); border:1px solid var(--border); border-radius:var(--radius-2xl); box-shadow:var(--shadow-sm); padding:28px 32px; }
    .hero-glow{ position:absolute; inset:-60% -20% auto -20%; height:420px; background: radial-gradient(560px 260px at 18% 0%, oklch(0.55 0.22 27 / .10), transparent 70%), radial-gradient(520px 280px at 86% 10%, oklch(0.45 0.10 230 / .12), transparent 70%), radial-gradient(700px 360px at 50% -18%, oklch(0.80 0.16 75 / .08), transparent 60%); pointer-events:none; }
    .hero-content{ position:relative; display:flex; justify-content:space-between; align-items:flex-start; gap:24px; flex-wrap:wrap; }
    .hero-eyebrow{ display:inline-flex; align-items:center; gap:8px; padding:6px 12px; background:var(--bg-subtle); border:1px solid var(--border); border-radius:var(--radius-full); font-size:var(--font-xs); font-weight:600; letter-spacing:var(--tracking-wide); color:var(--text-muted); margin-bottom:12px; }
    .eyebrow-dot{ width:6px; height:6px; border-radius:50%; background:var(--primary); box-shadow:0 0 0 4px oklch(0.55 0.22 27 / .15); }
    .eyebrow-separator{ opacity:.3; }
    .live-indicator{ display:inline-flex; align-items:center; gap:6px; color:var(--success); font-weight:700; }
    .live-indicator i{ width:6px; height:6px; background:var(--success); border-radius:50%; animation:pulseLive 1.6s ease infinite; }
    @keyframes pulseLive{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.6;transform:scale(.9)}}
    .hero-title{ font-size:var(--font-3xl); font-weight:850; letter-spacing:var(--tracking-tighter); line-height:var(--leading-tight); color:var(--text-primary); margin:0; }
    .hero-title-accent{ background:linear-gradient(90deg,var(--primary),oklch(0.65 0.18 27)); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; }
    .hero-subtitle{ margin:8px 0 0; font-size:var(--font-sm); color:var(--text-muted); line-height:var(--leading-relaxed); max-width:620px; }
    .hero-subtitle strong{ color:var(--text-secondary); font-weight:650; }
    .hero-actions{ display:flex; gap:12px; align-items:center; flex-wrap:wrap; }
    .btn-icon{ font-weight:800; }

    .po-metrics{ display:grid; grid-template-columns:repeat(4,1fr); gap:16px; }
    .metric-card{ position:relative; overflow:hidden; background:var(--surface); border:1px solid var(--border); border-radius:var(--radius-xl); padding:18px 20px; box-shadow:var(--shadow-xs); transition:transform var(--transition-spring), box-shadow var(--transition-base); }
    .metric-card:hover{ transform:translateY(-2px); box-shadow:var(--shadow-md); }
    .metric-card::before{ content:""; position:absolute; top:0; left:0; right:0; height:1px; background:linear-gradient(90deg,transparent,var(--border-strong),transparent); opacity:0; transition:opacity var(--transition-base); }
    .metric-card:hover::before{ opacity:1; }
    .metric-top{ display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; }
    .metric-icon{ width:36px; height:36px; border-radius:var(--radius-lg); display:grid; place-items:center; font-weight:700; border:1px solid var(--border); background:var(--bg-subtle); color:var(--text-secondary); }
    .metric-icon--success{ background:oklch(0.96 0.03 145); color:var(--success); border-color:oklch(0.9 0.05 145); }
    .metric-icon--danger{ background:var(--danger-bg); color:var(--danger); border-color:oklch(0.9 0.04 27); }
    .metric-icon--warm{ background:oklch(0.98 0.02 75); color:#92400e; border-color:oklch(0.92 0.05 75); }
    .metric-trend{ font-size:var(--font-xs); font-weight:700; padding:4px 8px; border-radius:var(--radius-full); background:var(--bg-subtle); color:var(--text-muted); }
    .metric-trend.active{ background:var(--text-primary); color:#fff; }
    .metric-trend.positive{ background:oklch(0.96 0.03 145); color:var(--success); }
    .metric-trend.negative{ background:var(--danger-bg); color:var(--danger); }
    .metric-label{ font-size:var(--font-xs); font-weight:600; letter-spacing:var(--tracking-wide); text-transform:uppercase; color:var(--text-muted); margin:0 0 4px; }
    .metric-value{ font-size:var(--font-2xl); font-weight:800; letter-spacing:var(--tracking-tighter); color:var(--text-primary); line-height:1; margin:0; }
    .metric-value span{ font-size:var(--font-xs); font-weight:600; color:var(--text-muted); margin-left:6px; text-transform:uppercase; }
    .metric-bar{ margin-top:12px; height:4px; background:var(--border-light); border-radius:var(--radius-full); overflow:hidden; }
    .metric-bar i{ display:block; height:100%; border-radius:var(--radius-full); }
    .po-metrics .metric-card:nth-child(1) .metric-bar i{ background:linear-gradient(90deg,var(--primary),oklch(0.65 0.18 27)); }
    .po-metrics .metric-card:nth-child(2) .metric-bar i{ background:linear-gradient(90deg,var(--danger),oklch(0.65 0.18 27)); }
    .po-metrics .metric-card:nth-child(3) .metric-bar i{ background:linear-gradient(90deg,var(--success),oklch(0.65 0.15 145)); }
    .po-metrics .metric-card:nth-child(4) .metric-bar i{ background:linear-gradient(90deg,oklch(0.80 0.16 75),oklch(0.75 0.15 75)); }
    .metric-foot{ margin-top:10px; font-size:var(--font-xs); color:var(--text-muted); display:flex; align-items:center; gap:6px; }
    .dot{ width:6px; height:6px; border-radius:50%; }
    .dot-success{ background:var(--success); box-shadow:0 0 0 3px var(--success-bg); }
    .dot-danger{ background:var(--danger); box-shadow:0 0 0 3px var(--danger-bg); }
    .dot-warning{ background:var(--warning); box-shadow:0 0 0 3px var(--warning-bg); }
    .dot-accent{ background:var(--accent); box-shadow:0 0 0 3px var(--accent-bg); }

    .po-toolbar{ display:flex; justify-content:space-between; align-items:center; gap:16px; flex-wrap:wrap; background:var(--surface); border:1px solid var(--border); border-radius:var(--radius-xl); padding:16px 20px; box-shadow:var(--shadow-xs); }
    .toolbar-title{ font-size:var(--font-lg); font-weight:750; letter-spacing:var(--tracking-tight); color:var(--text-primary); margin:0; }
    .toolbar-count{ font-size:var(--font-xs); color:var(--text-muted); background:var(--bg-subtle); padding:4px 10px; border-radius:var(--radius-full); border:1px solid var(--border); margin-left:8px; }
    .toolbar-left{ display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
    .tabs{ display:flex; gap:8px; background:var(--bg-subtle); border:1px solid var(--border); border-radius:var(--radius-full); padding:4px; }
    .tab{ padding:8px 14px; border-radius:var(--radius-full); border:1px solid transparent; background:transparent; font-size:var(--font-xs); font-weight:700; color:var(--text-secondary); cursor:pointer; transition:all var(--transition-fast); display:inline-flex; gap:6px; align-items:center; }
    .tab.active{ background:var(--text-primary); color:#fff; border-color:var(--text-primary); box-shadow:var(--shadow-xs); }
    .tab:hover:not(.active){ background:var(--surface); border-color:var(--border); }
    .tab-count{ padding:2px 6px; border-radius:var(--radius-full); background:oklch(1 0 0 / .14); border:1px solid oklch(1 0 0 / .14); font-size:.65rem; min-width:20px; text-align:center; }
    .tab.active .tab-count{ background:oklch(1 0 0 / .18); border-color:oklch(1 0 0 / .2); }

    .state{ background:var(--surface); border:1px solid var(--border); border-radius:var(--radius-xl); padding:48px 24px; text-align:center; box-shadow:var(--shadow-xs); }
    .state-loading{ color:var(--text-muted); display:grid; place-items:center; gap:16px; }
    .loader{ width:36px; height:36px; border:3px solid var(--border); border-top-color:var(--primary); border-radius:50%; animation:spin .8s linear infinite; margin:0 auto; }
    @keyframes spin{ to{transform:rotate(360deg)}}
    .loader-text p{ font-weight:650; color:var(--text-secondary); margin:0; }
    .loader-text span{ font-size:var(--font-xs); color:var(--text-muted); }
    .state-empty{ color:var(--text-muted); display:grid; place-items:center; gap:8px; }
    .state-empty h3{ font-size:var(--font-lg); font-weight:750; color:var(--text-primary); margin:8px 0 4px; }
    .state-empty p{ font-size:var(--font-sm); max-width:520px; }
    .empty-illus{ position:relative; width:80px; height:80px; margin:0 auto 8px; display:grid; place-items:center; }
    .empty-orb{ position:absolute; inset:0; background:radial-gradient(400px 200px at 50% 0%, oklch(0.96 0.02 27), transparent 70%); border:1px solid var(--border); border-radius:var(--radius-2xl); }
    .empty-emoji{ position:relative; font-size:2rem; }

    .po-grid{ display:grid; grid-template-columns:repeat(auto-fill,minmax(380px,1fr)); gap:16px; }
    .po-card{ background:var(--surface); border:1px solid var(--border); border-radius:var(--radius-xl); box-shadow:var(--shadow-xs); overflow:hidden; transition:transform var(--transition-spring), box-shadow var(--transition-base), border-color var(--transition-fast); position:relative; }
    .po-card:hover{ transform:translateY(-2px); box-shadow:var(--shadow-md); border-color:var(--border-strong); }
    .po-card.status-cancelled{ opacity:.6; }
    .po-card.status-received{ border-left:4px solid var(--success); }
    .po-card::before{ content:""; position:absolute; top:0; left:0; right:0; height:1px; background:linear-gradient(90deg,transparent,var(--border-strong),transparent); opacity:0; transition:opacity var(--transition-base); }
    .po-card:hover::before{ opacity:1; }
    .po-card-head{ display:flex; justify-content:space-between; align-items:flex-start; gap:12px; padding:18px 20px 14px; border-bottom:1px solid var(--border-light); background:linear-gradient(180deg,var(--surface),var(--bg-subtle)); }
    .po-number{ font-weight:800; font-size:var(--font-sm); color:var(--text-primary); display:block; letter-spacing:var(--tracking-tight); }
    .po-supplier{ font-size:var(--font-xs); color:var(--text-muted); }
    .status-pill{ display:inline-flex; align-items:center; gap:6px; padding:4px 10px; border-radius:var(--radius-full); font-size:var(--font-xs); font-weight:700; border:1px solid transparent; white-space:nowrap; }
    .status-pill::before{ content:""; width:6px; height:6px; border-radius:50%; background:currentColor; }
    .status-pending{ background:#fff3cd; color:#856404; border-color:#ffe69c; }
    .status-confirmed{ background:oklch(0.96 0.02 230); color:var(--accent); border-color:oklch(0.9 0.05 230); }
    .status-partial{ background:oklch(0.98 0.02 75); color:#92400e; border-color:oklch(0.92 0.05 75); }
    .status-received{ background:oklch(0.96 0.03 145); color:var(--success); border-color:oklch(0.9 0.05 145); }
    .status-cancelled{ background:var(--danger-bg); color:#991b1b; border-color:oklch(0.9 0.04 27); }
    .po-details{ padding:16px 20px; display:grid; gap:8px; }
    .detail-row{ display:flex; justify-content:space-between; font-size:var(--font-sm); }
    .detail-label{ color:var(--text-muted); font-weight:500; }
    .detail-value{ font-weight:600; color:var(--text-primary); font-variant-numeric:tabular-nums; }
    .detail-value.strong{ font-weight:800; }
    .detail-value.success{ color:var(--success); }
    .detail-value.overdue{ color:var(--danger); font-weight:800; }
    .detail-value.amount{ font-weight:800; font-size:var(--font-base); color:var(--primary); }
    .divider{ height:1px; background:var(--border-light); margin:6px 0; }
    .po-items{ margin:0 20px 16px; padding:12px; background:var(--bg-subtle); border:1px solid var(--border-light); border-radius:var(--radius-lg); display:grid; gap:6px; }
    .po-item{ display:flex; justify-content:space-between; gap:12px; padding:8px 10px; background:var(--surface); border:1px solid var(--border-light); border-radius:var(--radius-md); font-size:var(--font-xs); }
    .item-name{ font-weight:600; color:var(--text-primary); flex:1; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .item-qty{ color:var(--text-muted); font-weight:600; white-space:nowrap; }
    .item-qty.done{ color:var(--success); font-weight:800; }
    .po-actions{ display:flex; gap:8px; flex-wrap:wrap; padding:14px 20px 20px; border-top:1px solid var(--border-light); background:var(--bg-subtle); justify-content:flex-end; }

    /* Modals */
    .modal-overlay{ position:fixed; inset:0; background:oklch(0.15 0.02 280 / .58); backdrop-filter:blur(12px) saturate(140%); -webkit-backdrop-filter:blur(12px) saturate(140%); display:flex; align-items:center; justify-content:center; z-index:1000; padding:20px; animation:fadeIn 150ms ease; }
    .modal-card{ position:relative; background:var(--surface); width:100%; max-width:640px; border-radius:var(--radius-2xl); box-shadow:var(--shadow-2xl), 0 0 0 1px oklch(0.15 0.02 280 / .06); border:1px solid oklch(1 0 0 / .08); max-height:90vh; overflow:hidden; display:flex; flex-direction:column; animation:slideUp 320ms cubic-bezier(0.16,1,0.3,1); }
    .modal-lg{ max-width:720px; }
    .modal-premium{ overflow-y:auto; }
    .modal-glow{ position:absolute; inset:0 0 auto 0; height:180px; background: radial-gradient(500px 180px at 20% 0%, oklch(0.96 0.02 27 / .5), transparent 70%), radial-gradient(500px 180px at 80% 0%, oklch(0.96 0.02 230 / .4), transparent 70%); pointer-events:none; opacity:.6; }
    .modal-header{ position:relative; display:flex; justify-content:space-between; align-items:flex-start; gap:16px; padding:24px 28px 20px; border-bottom:1px solid var(--border-light); background:linear-gradient(180deg,var(--surface),var(--bg-subtle)); }
    .modal-header-left{ display:flex; gap:14px; align-items:flex-start; }
    .modal-icon{ width:44px; height:44px; border-radius:var(--radius-lg); background:var(--text-primary); color:#fff; display:grid; place-items:center; font-weight:800; flex-shrink:0; box-shadow:var(--shadow-sm); }
    .modal-title{ font-size:var(--font-lg); font-weight:800; letter-spacing:var(--tracking-tight); color:var(--text-primary); margin:0; }
    .modal-subtitle{ font-size:var(--font-sm); color:var(--text-muted); margin:4px 0 0; line-height:var(--leading-normal); }
    .modal-close{ width:36px; height:36px; border-radius:var(--radius-md); background:var(--bg-subtle); border:1px solid var(--border); color:var(--text-muted); display:grid; place-items:center; cursor:pointer; font-size:1.2rem; transition:all var(--transition-fast); }
    .modal-close:hover{ background:var(--surface); color:var(--text-primary); border-color:var(--border-strong); }
    .modal-body{ padding:24px 28px; display:grid; gap:16px; position:relative; }
    .field{ display:grid; gap:6px; }
    .field-label{ font-size:var(--font-xs); font-weight:650; letter-spacing:var(--tracking-wide); text-transform:uppercase; color:var(--text-secondary); }
    .req{ color:var(--danger); }
    .field-grid{ display:grid; grid-template-columns:1fr 1fr; gap:16px; }
    .form-section{ display:grid; gap:12px; padding:16px; background:var(--bg-subtle); border:1px solid var(--border); border-radius:var(--radius-xl); }
    .form-section-header{ display:flex; justify-content:space-between; align-items:center; }
    .form-section-header h4{ margin:0; font-size:var(--font-sm); font-weight:750; color:var(--text-primary); }
    .item-line{ display:flex; gap:8px; align-items:center; }
    .item-qty-input{ width:80px; }
    .item-price-input{ width:130px; }
    .item-total{ text-align:right; font-size:var(--font-sm); padding-top:8px; border-top:1px solid var(--border-light); color:var(--text-muted); }
    .item-total strong{ color:var(--primary); font-weight:800; }
    .receive-list{ display:grid; gap:10px; }
    .receive-item{ display:flex; justify-content:space-between; align-items:center; gap:12px; padding:12px; background:var(--bg-subtle); border:1px solid var(--border-light); border-radius:var(--radius-lg); }
    .receive-info{ display:grid; gap:2px; }
    .receive-info strong{ font-size:var(--font-sm); color:var(--text-primary); }
    .muted{ font-size:var(--font-xs); color:var(--text-muted); }
    .receive-input{ width:100px; text-align:center; font-weight:700; }
    .modal-footer{ display:flex; justify-content:space-between; align-items:center; gap:12px; padding:16px 28px 24px; border-top:1px solid var(--border-light); }
    .modal-footer.premium{ background:var(--bg-subtle); }
    .btn-loading{ display:inline-flex; align-items:center; gap:8px; }
    .mini-loader{ width:16px; height:16px; border:2px solid oklch(1 0 0 / .3); border-top-color:#fff; border-radius:50%; animation:spin .7s linear infinite; }
    .btn-primary .mini-loader{ border-color:oklch(1 0 0 / .3); border-top-color:#fff; }
    .btn-secondary .mini-loader{ border-color:var(--border-strong); border-top-color:var(--primary); }
    @keyframes fadeIn{ from{opacity:0} to{opacity:1} }
    @keyframes slideUp{ from{opacity:0; transform:translateY(12px)} to{opacity:1; transform:translateY(0)} }

    @media(max-width:1100px){ .po-metrics{ grid-template-columns:1fr 1fr; } .po-grid{ grid-template-columns:1fr 1fr; } }
    @media(max-width:768px){ .po-page{ padding:16px; gap:16px; } .po-hero{ padding:20px; } .hero-title{ font-size:var(--font-2xl); } .po-toolbar{ flex-direction:column; align-items:stretch; } .tabs{ width:100%; justify-content:space-between; } .po-grid{ grid-template-columns:1fr; } .field-grid{ grid-template-columns:1fr; } .item-line{ flex-wrap:wrap; } .item-qty-input, .item-price-input{ width:100%; } }
    @media(max-width:640px){ .po-metrics{ grid-template-columns:1fr; } .modal-header, .modal-body, .modal-footer{ padding-left:20px; padding-right:20px; } }
  `]
})
export class PurchaseOrdersComponent implements OnInit {
  allOrders: PurchaseOrder[] = [];
  overdueOrders: PurchaseOrder[] = [];
  suppliers: Supplier[] = [];
  loading = true;
  tab: 'all' | 'overdue' | 'received' = 'all';
  saving = false;
  deletingId: string | null = null;
  receivingId: string | null = null;
  remindingId: string | null = null;

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
    private toastService: ToastService,
    private changeDetector: ChangeDetectorRef
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
        this.toastService.show('Impossible de charger les commandes fournisseurs.', 'error');
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
        this.toastService.show('Impossible de charger les commandes en retard.', 'error');
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
    if (this.saving) return;
    this.saving = true;
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

    action
      .pipe(finalize(() => { this.saving = false; this.changeDetector.detectChanges(); }))
      .subscribe({
        next: () => {
          this.showModal = false;
          this.changeDetector.detectChanges();
          this.loadAll(() => this.toastService.show('Commande enregistrée', 'success'));
        },
        error: (err) => this.toastService.show(err.error?.error || 'Erreur lors de la sauvegarde', 'error')
      });
  }

  deleteOrder(o: PurchaseOrder): void {
    if (!confirm(`Supprimer la commande ${o.orderNumber} ?`)) return;
    if (this.deletingId) return;
    this.deletingId = o.id!;
    this.poService.deleteOrder(o.id!)
      .pipe(finalize(() => { this.deletingId = null; this.changeDetector.detectChanges(); }))
      .subscribe({
        next: () => {
          this.changeDetector.detectChanges();
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
    if (this.receivingId) return;
    this.receivingId = this.receiveOrder.id!;
    this.poService.receiveOrder(this.receiveOrder.id!, this.receiveItems)
      .pipe(finalize(() => { this.receivingId = null; }))
      .subscribe({
        next: () => {
          this.showReceiveModal = false;
          this.loadAll(() => this.toastService.show('Commande reçue', 'success'));
        },
        error: (err) => this.toastService.show(err.error?.error || 'Erreur lors de la réception', 'error')
      });
  }

  sendReminder(o: PurchaseOrder): void {
    if (this.remindingId) return;
    this.remindingId = o.id!;
    this.poService.sendReminder(o.id!)
      .pipe(finalize(() => { this.remindingId = null; }))
      .subscribe({
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
