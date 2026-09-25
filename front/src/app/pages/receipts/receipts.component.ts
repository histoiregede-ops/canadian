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
    <div class="receipts-page">
      <!-- ===== HERO ===== -->
      <header class="receipts-hero">
        <div class="hero-glow"></div>
        <div class="hero-content">
          <div class="hero-left">
            <div class="hero-eyebrow">
              <span class="eyebrow-dot"></span>
              <span>Reçus • Traçabilité premium</span>
              <span class="eyebrow-separator">•</span>
              <span class="live-indicator"><i></i> {{ orders.length }} reçus</span>
            </div>
            <h1 class="hero-title">
              Reçus de
              <span class="hero-title-accent">vente</span>
            </h1>
            <p class="hero-subtitle">
              Retrouvez, filtrez et réimprimez tous les reçus — <strong>{{ orders.length }} commandes</strong> • {{ counts.paid }} payées • {{ counts.pending }} en attente
            </p>
          </div>
          <div class="hero-actions">
            <span class="hero-meta"><span class="meta-dot dot-success"></span> {{ counts.paid }} payées</span>
            <span class="hero-meta"><span class="meta-dot dot-warning"></span> {{ counts.pending }} en attente</span>
          </div>
        </div>
      </header>

      <!-- ===== KPI ===== -->
      <section class="receipts-metrics">
        <article class="metric-card" (click)="filter='all'" style="cursor:pointer">
          <div class="metric-top">
            <div class="metric-icon"><span>◫</span></div>
            <span class="metric-trend" [class.active]="filter==='all'">Toutes</span>
          </div>
          <p class="metric-label">Total</p>
          <p class="metric-value">{{ orders.length }}<span>reçus</span></p>
          <div class="metric-bar"><i style="width:78%"></i></div>
          <p class="metric-foot"><span class="dot dot-accent"></span> Historique complet</p>
        </article>
        <article class="metric-card" (click)="filter='paid'" style="cursor:pointer">
          <div class="metric-top">
            <div class="metric-icon metric-icon--success"><span>✓</span></div>
            <span class="metric-trend positive" [class.active]="filter==='paid'">{{ counts.paid }} payées</span>
          </div>
          <p class="metric-label">Payées</p>
          <p class="metric-value">{{ counts.paid }}<span>validées</span></p>
          <div class="metric-bar"><i [style.width.%]="orders.length ? (counts.paid / orders.length * 100) : 0"></i></div>
          <p class="metric-foot"><span class="dot dot-success"></span> Encaissement confirmé</p>
        </article>
        <article class="metric-card" (click)="filter='pending'" style="cursor:pointer">
          <div class="metric-top">
            <div class="metric-icon metric-icon--warm"><span>◷</span></div>
            <span class="metric-trend neutral" [class.active]="filter==='pending'">{{ counts.pending }} en attente</span>
          </div>
          <p class="metric-label">En attente</p>
          <p class="metric-value">{{ counts.pending }}<span>à encaisser</span></p>
          <div class="metric-bar"><i [style.width.%]="orders.length ? (counts.pending / orders.length * 100) : 0"></i></div>
          <p class="metric-foot"><span class="dot dot-warning"></span> Action requise</p>
        </article>
        <article class="metric-card" (click)="filter='cancelled'" style="cursor:pointer">
          <div class="metric-top">
            <div class="metric-icon metric-icon--danger"><span>⊘</span></div>
            <span class="metric-trend negative" [class.active]="filter==='cancelled'">{{ counts.cancelled }} annulées</span>
          </div>
          <p class="metric-label">Annulées</p>
          <p class="metric-value">{{ counts.cancelled }}<span>annulées</span></p>
          <div class="metric-bar"><i [style.width.%]="orders.length ? (counts.cancelled / orders.length * 100) : 0"></i></div>
          <p class="metric-foot"><span class="dot dot-danger"></span> Stock restauré</p>
        </article>
      </section>

      <!-- ===== TOOLBAR ===== -->
      <section class="receipts-toolbar">
        <div class="toolbar-left">
          <h2 class="toolbar-title">Reçus</h2>
          <span class="toolbar-count">{{ filtered.length }} / {{ orders.length }} • {{ filter === 'all' ? 'Toutes' : getStatusLabel(filter) }}</span>
        </div>
        <div class="toolbar-right">
          <div class="search-field">
            <span class="search-icon">⌕</span>
            <input type="text" [(ngModel)]="searchQuery" placeholder="N° commande, client, produit…" class="search-input" />
          </div>
          <button class="btn btn-ghost btn-sm" (click)="searchQuery=''; filter='all'">Réinitialiser</button>
        </div>
      </section>

      <section class="pills-bar">
        <div class="pills-label">Filtrer</div>
        <div class="pills">
          <button class="pill" [class.active]="filter === 'all'" (click)="filter = 'all'">
            Toutes <span class="pill-count">{{ orders.length }}</span>
          </button>
          <button class="pill pill-success" [class.active]="filter === 'paid'" (click)="filter = 'paid'">
            Payées <span class="pill-count">{{ counts.paid }}</span>
          </button>
          <button class="pill pill-warning" [class.active]="filter === 'pending'" (click)="filter = 'pending'">
            En attente <span class="pill-count">{{ counts.pending }}</span>
          </button>
          <button class="pill pill-danger" [class.active]="filter === 'cancelled'" (click)="filter = 'cancelled'">
            Annulées <span class="pill-count">{{ counts.cancelled }}</span>
          </button>
        </div>
      </section>

      <!-- Loading -->
      <div class="state state-loading" *ngIf="loading">
        <div class="loader"></div>
        <div class="loader-text">
          <p>Chargement des reçus…</p>
          <span>Historique des ventes</span>
        </div>
      </div>

      <!-- Empty -->
      <div class="state state-empty" *ngIf="!loading && filtered.length === 0">
        <div class="empty-illus">
          <div class="empty-orb"></div>
          <span class="empty-emoji">◫</span>
        </div>
        <h3>Aucun reçu trouvé</h3>
        <p>Effectuez d’abord des ventes dans le POS ou ajustez vos filtres.</p>
      </div>

      <!-- Receipts grid -->
      <div class="receipt-grid" *ngIf="!loading && filtered.length > 0">
        <article class="receipt-card" *ngFor="let order of filtered; trackBy: trackByOrderId" [class]="'status-' + order.status">
          <div class="receipt-head">
            <div class="receipt-info">
              <span class="receipt-number">#{{ order.orderNumber }}</span>
              <span class="receipt-date">{{ order.createdAt | date:'dd MMM yyyy • HH:mm' }}</span>
            </div>
            <span class="status-pill" [class]="'status-' + getStatusClass(order.status)">
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
              <span class="detail-value mono">{{ order.Customer!.phone }}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Paiement</span>
              <span class="detail-value pay-pill">{{ getPaymentLabel(order.paymentMethod) }}</span>
            </div>
            <div class="detail-row" *ngIf="order.products">
              <span class="detail-label">Articles</span>
              <span class="detail-value strong">{{ order.products.length }} produit(s)</span>
            </div>

            <div class="product-list" *ngIf="order.products?.length">
              <div class="product-list-title">Détail produits</div>
              <div class="product-row" *ngFor="let item of order.products; trackBy: trackByProductItemId">
                <span class="product-name">{{ item.Product?.name || 'Produit ' + item.productId.substring(0,8) }}</span>
                <span class="product-qty">×{{ item.quantity }} • {{ item.unitPrice | number }} FCFA</span>
              </div>
            </div>

            <div class="divider"></div>
            <div class="detail-row total">
              <span class="detail-label">Total</span>
              <span class="detail-value amount">{{ order.totalAmount | number }} FCFA</span>
            </div>
            <div class="detail-row paid" *ngIf="order.paidAmount > 0">
              <span class="detail-label">Payé</span>
              <span class="detail-value amount success">{{ order.paidAmount | number }} FCFA</span>
            </div>
            <div class="detail-row" *ngIf="order.paidAmount < order.totalAmount && order.status!=='cancelled'">
              <span class="detail-label">Solde</span>
              <span class="detail-value amount danger">{{ (order.totalAmount - order.paidAmount) | number }} FCFA</span>
            </div>
          </div>

          <div class="receipt-actions">
            <button class="btn btn-primary btn-sm" (click)="printReceipt(order)" [disabled]="order.status === 'cancelled'">
              ⎙ Réimprimer
            </button>
            <span class="action-hint" *ngIf="order.status==='cancelled'">Annulé</span>
          </div>
        </article>
      </div>
    </div>
  `,
  styles: [`
    .receipts-page{ --rec-max:1440px; display:grid; gap:24px; max-width:var(--rec-max); margin:0 auto; padding:24px; background:var(--bg-color); min-height:100vh; }
    .receipts-hero{ position:relative; overflow:hidden; background:var(--surface); border:1px solid var(--border); border-radius:var(--radius-2xl); box-shadow:var(--shadow-sm); padding:28px 32px; }
    .hero-glow{ position:absolute; inset:-60% -20% auto -20%; height:420px; background: radial-gradient(560px 280px at 18% 0%, oklch(0.55 0.22 27 / .10), transparent 70%), radial-gradient(520px 280px at 86% 10%, oklch(0.45 0.10 230 / .12), transparent 70%), radial-gradient(700px 360px at 50% -18%, oklch(0.80 0.16 75 / .08), transparent 60%); pointer-events:none; }
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
    .hero-actions{ display:flex; gap:8px; align-items:center; flex-wrap:wrap; }
    .hero-meta{ display:inline-flex; align-items:center; gap:6px; padding:6px 12px; background:var(--surface); border:1px solid var(--border); border-radius:var(--radius-full); font-size:var(--font-xs); font-weight:650; color:var(--text-secondary); box-shadow:var(--shadow-xs); }
    .meta-dot{ width:6px; height:6px; border-radius:50%; }
    .dot-success{ background:var(--success); box-shadow:0 0 0 3px var(--success-bg); }
    .dot-warning{ background:var(--warning); box-shadow:0 0 0 3px var(--warning-bg); }

    .receipts-metrics{ display:grid; grid-template-columns:repeat(4,1fr); gap:16px; }
    .metric-card{ position:relative; overflow:hidden; background:var(--surface); border:1px solid var(--border); border-radius:var(--radius-xl); padding:18px 20px; box-shadow:var(--shadow-xs); transition:transform var(--transition-spring), box-shadow var(--transition-base); }
    .metric-card:hover{ transform:translateY(-2px); box-shadow:var(--shadow-md); }
    .metric-card::before{ content:""; position:absolute; top:0; left:0; right:0; height:1px; background:linear-gradient(90deg,transparent,var(--border-strong),transparent); opacity:0; transition:opacity var(--transition-base); }
    .metric-card:hover::before{ opacity:1; }
    .metric-top{ display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; }
    .metric-icon{ width:36px; height:36px; border-radius:var(--radius-lg); display:grid; place-items:center; font-weight:700; border:1px solid var(--border); background:var(--bg-subtle); color:var(--text-secondary); }
    .metric-icon--success{ background:oklch(0.96 0.03 145); color:var(--success); border-color:oklch(0.9 0.05 145); }
    .metric-icon--warm{ background:oklch(0.98 0.02 75); color:#92400e; border-color:oklch(0.92 0.05 75); }
    .metric-icon--danger{ background:var(--danger-bg); color:var(--danger); border-color:oklch(0.9 0.04 27); }
    .metric-trend{ font-size:var(--font-xs); font-weight:700; padding:4px 8px; border-radius:var(--radius-full); background:var(--bg-subtle); color:var(--text-muted); }
    .metric-trend.active{ background:var(--text-primary); color:#fff; }
    .metric-trend.positive{ background:oklch(0.96 0.03 145); color:var(--success); }
    .metric-trend.negative{ background:var(--danger-bg); color:var(--danger); }
    .metric-label{ font-size:var(--font-xs); font-weight:600; letter-spacing:var(--tracking-wide); text-transform:uppercase; color:var(--text-muted); margin:0 0 4px; }
    .metric-value{ font-size:var(--font-2xl); font-weight:800; letter-spacing:var(--tracking-tighter); color:var(--text-primary); line-height:1; margin:0; }
    .metric-value span{ font-size:var(--font-xs); font-weight:600; color:var(--text-muted); margin-left:6px; text-transform:uppercase; }
    .metric-bar{ margin-top:12px; height:4px; background:var(--border-light); border-radius:var(--radius-full); overflow:hidden; }
    .metric-bar i{ display:block; height:100%; border-radius:var(--radius-full); }
    .receipts-metrics .metric-card:nth-child(1) .metric-bar i{ background:linear-gradient(90deg,var(--primary),oklch(0.65 0.18 27)); }
    .receipts-metrics .metric-card:nth-child(2) .metric-bar i{ background:linear-gradient(90deg,var(--success),oklch(0.65 0.15 145)); }
    .receipts-metrics .metric-card:nth-child(3) .metric-bar i{ background:linear-gradient(90deg,oklch(0.80 0.16 75),oklch(0.75 0.15 75)); }
    .receipts-metrics .metric-card:nth-child(4) .metric-bar i{ background:linear-gradient(90deg,var(--danger),oklch(0.65 0.18 27)); }
    .metric-foot{ margin-top:10px; font-size:var(--font-xs); color:var(--text-muted); display:flex; align-items:center; gap:6px; }
    .dot{ width:6px; height:6px; border-radius:50%; }
    .dot-success{ background:var(--success); box-shadow:0 0 0 3px var(--success-bg); }
    .dot-danger{ background:var(--danger); box-shadow:0 0 0 3px var(--danger-bg); }
    .dot-warning{ background:var(--warning); box-shadow:0 0 0 3px var(--warning-bg); }
    .dot-accent{ background:var(--accent); box-shadow:0 0 0 3px var(--accent-bg); }

    .receipts-toolbar{ display:flex; justify-content:space-between; align-items:center; gap:16px; flex-wrap:wrap; background:var(--surface); border:1px solid var(--border); border-radius:var(--radius-xl); padding:16px 20px; box-shadow:var(--shadow-xs); }
    .toolbar-title{ font-size:var(--font-lg); font-weight:750; letter-spacing:var(--tracking-tight); color:var(--text-primary); margin:0; }
    .toolbar-count{ font-size:var(--font-xs); color:var(--text-muted); background:var(--bg-subtle); padding:4px 10px; border-radius:var(--radius-full); border:1px solid var(--border); margin-left:8px; }
    .toolbar-left{ display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
    .toolbar-right{ display:flex; gap:12px; align-items:center; }
    .search-field{ position:relative; display:flex; align-items:center; }
    .search-icon{ position:absolute; left:12px; color:var(--text-light); pointer-events:none; }
    .search-input{ padding:10px 14px 10px 36px; background:var(--bg-subtle); border:1px solid var(--border); border-radius:var(--radius-lg); font-size:var(--font-sm); color:var(--text-primary); width:300px; transition:all var(--transition-fast); }
    .search-input:focus{ outline:none; border-color:var(--primary); background:var(--surface); box-shadow:var(--focus-ring); }
    .pills-bar{ display:flex; gap:12px; align-items:center; flex-wrap:wrap; padding:12px 14px; background:var(--surface); border:1px solid var(--border); border-radius:var(--radius-xl); box-shadow:var(--shadow-xs); }
    .pills-label{ font-size:var(--font-xs); font-weight:700; letter-spacing:var(--tracking-wide); text-transform:uppercase; color:var(--text-muted); }
    .pills{ display:flex; gap:8px; flex-wrap:wrap; }
    .pill{ display:inline-flex; align-items:center; gap:6px; padding:6px 12px; background:var(--bg-subtle); border:1px solid var(--border); border-radius:var(--radius-full); font-size:var(--font-xs); font-weight:600; color:var(--text-secondary); cursor:pointer; transition:all var(--transition-fast); white-space:nowrap; }
    .pill:hover{ transform:translateY(-1px); border-color:var(--border-strong); background:var(--surface); box-shadow:var(--shadow-xs); }
    .pill.active{ background:var(--text-primary); color:#fff; border-color:var(--text-primary); }
    .pill-success.active{ background:var(--success); border-color:var(--success); }
    .pill-warning.active{ background:var(--warning); border-color:var(--warning); color:#fff; }
    .pill-danger.active{ background:var(--danger); border-color:var(--danger); color:#fff; }
    .pill-count{ padding:2px 6px; border-radius:var(--radius-full); background:oklch(1 0 0 / .14); border:1px solid oklch(1 0 0 / .14); font-size:.65rem; min-width:20px; text-align:center; }
    .pill.active .pill-count{ background:oklch(1 0 0 / .18); border-color:oklch(1 0 0 / .2); }

    .state{ background:var(--surface); border:1px solid var(--border); border-radius:var(--radius-xl); padding:48px 24px; text-align:center; box-shadow:var(--shadow-xs); }
    .state-loading{ color:var(--text-muted); display:grid; place-items:center; gap:16px; }
    .loader{ width:36px; height:36px; border:3px solid var(--border); border-top-color:var(--primary); border-radius:50%; animation:spin .8s linear infinite; margin:0 auto; }
    @keyframes spin{ to{transform:rotate(360deg)}}
    .loader-text p{ font-weight:650; color:var(--text-secondary); margin:0; }
    .loader-text span{ font-size:var(--font-xs); color:var(--text-muted); }
    .state-empty{ color:var(--text-muted); display:grid; place-items:center; gap:8px; }
    .state-empty h3{ font-size:var(--font-lg); font-weight:750; color:var(--text-primary); margin:8px 0 4px; }
    .state-empty p{ font-size:var(--font-sm); max-width:480px; }
    .empty-illus{ position:relative; width:80px; height:80px; margin:0 auto 8px; display:grid; place-items:center; }
    .empty-orb{ position:absolute; inset:0; background:radial-gradient(400px 200px at 50% 0%, oklch(0.96 0.02 27), transparent 70%); border:1px solid var(--border); border-radius:var(--radius-2xl); }
    .empty-emoji{ position:relative; font-size:2rem; }

    .receipt-grid{ display:grid; grid-template-columns:repeat(auto-fill,minmax(340px,1fr)); gap:16px; }
    .receipt-card{ background:var(--surface); border:1px solid var(--border); border-radius:var(--radius-xl); box-shadow:var(--shadow-xs); overflow:hidden; transition:transform var(--transition-spring), box-shadow var(--transition-base), border-color var(--transition-fast); position:relative; display:flex; flex-direction:column; }
    .receipt-card:hover{ transform:translateY(-2px); box-shadow:var(--shadow-md); border-color:var(--border-strong); }
    .receipt-card::before{ content:""; position:absolute; top:0; left:0; right:0; height:1px; background:linear-gradient(90deg,transparent,var(--border-strong),transparent); opacity:0; transition:opacity var(--transition-base); }
    .receipt-card:hover::before{ opacity:1; }
    .receipt-card.status-cancelled{ opacity:.72; }
    .receipt-head{ display:flex; justify-content:space-between; align-items:flex-start; gap:12px; padding:18px 20px 14px; border-bottom:1px solid var(--border-light); background:linear-gradient(180deg,var(--surface),var(--bg-subtle)); }
    .receipt-info{ display:grid; gap:2px; }
    .receipt-number{ font-weight:800; font-size:var(--font-base); color:var(--text-primary); letter-spacing:var(--tracking-tight); font-family:var(--font-mono); }
    .receipt-date{ font-size:var(--font-xs); color:var(--text-muted); font-weight:600; }
    .status-pill{ display:inline-flex; align-items:center; gap:6px; padding:4px 10px; border-radius:var(--radius-full); font-size:var(--font-xs); font-weight:700; border:1px solid transparent; white-space:nowrap; }
    .status-pill::before{ content:""; width:6px; height:6px; border-radius:50%; background:currentColor; }
    .status-paid, .status-delivered{ background:oklch(0.96 0.03 145); color:var(--success); border-color:oklch(0.9 0.05 145); }
    .status-pending{ background:#fff3cd; color:#856404; border-color:#ffe69c; }
    .status-partially_paid{ background:oklch(0.96 0.02 230); color:var(--accent); border-color:oklch(0.9 0.05 230); }
    .status-cancelled{ background:var(--danger-bg); color:#991b1b; border-color:oklch(0.9 0.04 27); }
    .status-shipped{ background:oklch(0.96 0.02 230); color:#0c5460; border-color:oklch(0.85 0.05 230); }
    .receipt-details{ padding:16px 20px; display:grid; gap:8px; flex:1; }
    .detail-row{ display:flex; justify-content:space-between; gap:12px; font-size:var(--font-sm); }
    .detail-label{ color:var(--text-muted); font-weight:500; }
    .detail-value{ font-weight:600; color:var(--text-primary); font-variant-numeric:tabular-nums; text-align:right; }
    .detail-value.strong{ font-weight:800; }
    .detail-value.mono{ font-family:var(--font-mono); font-size:var(--font-xs); }
    .pay-pill{ padding:2px 8px; border-radius:var(--radius-full); background:var(--bg-subtle); border:1px solid var(--border); font-size:var(--font-xs); font-weight:700; }
    .product-list{ margin-top:6px; padding:12px; background:var(--bg-subtle); border:1px solid var(--border-light); border-radius:var(--radius-lg); display:grid; gap:6px; }
    .product-list-title{ font-size:var(--font-xs); font-weight:700; letter-spacing:var(--tracking-wide); text-transform:uppercase; color:var(--text-muted); }
    .product-row{ display:flex; justify-content:space-between; gap:12px; padding:8px 0; border-bottom:1px dashed var(--border); font-size:var(--font-sm); }
    .product-row:last-child{ border-bottom:none; }
    .product-name{ font-weight:600; color:var(--text-primary); flex:1; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .product-qty{ color:var(--text-muted); font-weight:600; white-space:nowrap; font-variant-numeric:tabular-nums; }
    .divider{ height:1px; background:var(--border-light); margin:6px 0; }
    .detail-row.total .detail-value.amount{ font-size:var(--font-lg); font-weight:800; color:var(--primary); }
    .detail-row.paid .detail-value.amount.success{ color:var(--success); }
    .detail-row .detail-value.amount.danger{ color:var(--danger); }
    .receipt-actions{ display:flex; justify-content:space-between; align-items:center; padding:14px 20px 20px; border-top:1px solid var(--border-light); background:var(--bg-subtle); }
    .action-hint{ font-size:var(--font-xs); font-weight:700; color:var(--danger); }

    @media(max-width:1100px){ .receipts-metrics{ grid-template-columns:1fr 1fr; } .receipt-grid{ grid-template-columns:1fr 1fr; } }
    @media(max-width:768px){ .receipts-page{ padding:16px; gap:16px; } .receipts-hero{ padding:20px; } .hero-title{ font-size:var(--font-2xl); } .receipts-toolbar{ flex-direction:column; align-items:stretch; } .search-input{ width:100%; } .toolbar-right{ flex-direction:column; align-items:stretch; } .receipt-grid{ grid-template-columns:1fr; } .pills-bar{ flex-direction:column; align-items:stretch; } }
    @media(max-width:640px){ .receipts-metrics{ grid-template-columns:1fr; } }
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
  trackByProductItemId(index: number, item: any): string {
    return item?.id ?? item?.productId ?? index;
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
        (o.Customer?.name || '').toLowerCase().includes(q) ||
        (o.products || []).some(item => (item.Product?.name || '').toLowerCase().includes(q))
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
