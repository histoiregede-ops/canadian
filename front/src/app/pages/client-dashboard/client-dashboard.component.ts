import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { CustomerAuthService, Customer } from '../../services/customer-auth';
import { OrderService } from '../../services/order';
import { MessagingService, Conversation } from '../../services/messaging';

interface Order {
  id: string;
  total: number;
  status: string;
  createdAt: Date;
  items: any[];
}

interface LoyaltyInfo {
  points: number;
  level: string;
  nextLevelPoints: number;
}

@Component({
  selector: 'app-client-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="dashboard-container">
      <!-- Header -->
      <div class="dashboard-header">
        <h1>Mon Espace Client</h1>
        <p>Bienvenue, {{ customer?.name }} !</p>
      </div>

      <!-- Loyalty Points Card -->
      <div class="loyalty-card" *ngIf="loyaltyInfo">
        <div class="loyalty-header">
          <h3>Programme de Fidélité</h3>
          <span class="loyalty-level" [class]="'level-' + loyaltyInfo.level">{{ loyaltyInfo.level | titlecase }}</span>
        </div>
        <div class="loyalty-points">
          <div class="points-display">
            <span class="points-number">{{ loyaltyInfo.points }}</span>
            <span class="points-label">points</span>
          </div>
          <div class="progress-bar" *ngIf="loyaltyInfo.nextLevelPoints > 0">
            <div class="progress-fill" [style.width.%]="getProgressPercentage()"></div>
          </div>
          <p class="next-level" *ngIf="loyaltyInfo.nextLevelPoints > 0">
            {{ loyaltyInfo.nextLevelPoints - loyaltyInfo.points }} points pour le niveau suivant
          </p>
        </div>
      </div>

      <!-- Quick Actions -->
      <div class="quick-actions">
        <a routerLink="/shop" class="action-btn primary">
          <i class="icon-shop"></i>
          Continuer mes achats
        </a>
        <a routerLink="/messages" class="action-btn secondary">
          <i class="icon-message"></i>
          Mes messages
          <span class="badge" *ngIf="unreadMessages > 0">{{ unreadMessages }}</span>
        </a>
      </div>

      <!-- Recent Orders -->
      <div class="orders-section">
        <h2>Mes Commandes Récentes</h2>
        <div class="orders-grid" *ngIf="recentOrders.length > 0; else noOrders">
          <div class="order-card" *ngFor="let order of recentOrders">
            <div class="order-header">
              <span class="order-id">Commande #{{ order.id }}</span>
              <span class="order-status" [class]="'status-' + order.status">{{ getStatusLabel(order.status) }}</span>
            </div>
            <div class="order-details">
              <p class="order-total">{{ order.total }}€</p>
              <p class="order-date">{{ order.createdAt | date:'dd/MM/yyyy' }}</p>
            </div>
            <div class="order-actions">
              <button class="btn-outline" (click)="viewOrderDetails(order)">Voir détails</button>
              <button class="btn-primary" *ngIf="canTrackOrder(order)" (click)="trackOrder(order)">Suivre</button>
            </div>
          </div>
        </div>
        <ng-template #noOrders>
          <div class="empty-state">
            <p>Vous n'avez pas encore passé de commande.</p>
            <a routerLink="/shop" class="btn-primary">Découvrir nos produits</a>
          </div>
        </ng-template>
      </div>

      <!-- Account Settings -->
      <div class="account-section">
        <h2>Mon Profil</h2>
        <div class="profile-info">
          <div class="info-item">
            <label>Email:</label>
            <span>{{ customer?.email }}</span>
          </div>
          <div class="info-item">
            <label>Téléphone:</label>
            <span>{{ customer?.phone || 'Non renseigné' }}</span>
          </div>
          <div class="info-item">
            <label>Adresse:</label>
            <span>{{ customer?.address || 'Non renseignée' }}</span>
          </div>
        </div>
        <button class="btn-outline" (click)="editProfile()">Modifier mon profil</button>
      </div>
    </div>
  `,
  styles: [`
    .dashboard-container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
      background: #f8f9fa;
      min-height: 100vh;
    }

    .dashboard-header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 40px;
      border-radius: 15px;
      margin-bottom: 30px;
      text-align: center;
    }

    .dashboard-header h1 {
      margin: 0 0 10px 0;
      font-size: 2.5rem;
    }

    .loyalty-card {
      background: white;
      padding: 30px;
      border-radius: 15px;
      margin-bottom: 30px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    }

    .loyalty-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }

    .loyalty-level {
      padding: 8px 16px;
      border-radius: 20px;
      font-weight: bold;
      text-transform: uppercase;
      font-size: 0.9rem;
    }

    .level-bronze { background: #cd7f32; color: white; }
    .level-silver { background: #c0c0c0; color: black; }
    .level-gold { background: #ffd700; color: black; }
    .level-platinum { background: #e5e4e2; color: black; }

    .points-display {
      text-align: center;
      margin-bottom: 20px;
    }

    .points-number {
      font-size: 3rem;
      font-weight: bold;
      color: #667eea;
      display: block;
    }

    .points-label {
      font-size: 1.2rem;
      color: #666;
    }

    .progress-bar {
      width: 100%;
      height: 8px;
      background: #e9ecef;
      border-radius: 4px;
      overflow: hidden;
      margin-bottom: 10px;
    }

    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #667eea, #764ba2);
      transition: width 0.3s ease;
    }

    .quick-actions {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 20px;
      margin-bottom: 40px;
    }

    .action-btn {
      display: flex;
      align-items: center;
      gap: 15px;
      padding: 20px;
      background: white;
      border-radius: 10px;
      text-decoration: none;
      color: #333;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      transition: transform 0.2s, box-shadow 0.2s;
      position: relative;
    }

    .action-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 8px rgba(0,0,0,0.15);
    }

    .action-btn.primary {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }

    .badge {
      background: #dc3545;
      color: white;
      border-radius: 50%;
      padding: 2px 8px;
      font-size: 0.8rem;
      margin-left: auto;
    }

    .orders-section, .account-section {
      background: white;
      padding: 30px;
      border-radius: 15px;
      margin-bottom: 30px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    }

    .orders-section h2, .account-section h2 {
      margin-top: 0;
      color: #2c3e50;
      margin-bottom: 20px;
    }

    .orders-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 20px;
    }

    .order-card {
      border: 1px solid #e9ecef;
      border-radius: 10px;
      padding: 20px;
      background: #f8f9fa;
    }

    .order-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 15px;
    }

    .order-id {
      font-weight: bold;
      color: #667eea;
    }

    .order-status {
      padding: 4px 12px;
      border-radius: 15px;
      font-size: 0.8rem;
      font-weight: bold;
      text-transform: uppercase;
    }

    .status-pending { background: #fff3cd; color: #856404; }
    .status-confirmed { background: #d1ecf1; color: #0c5460; }
    .status-shipped { background: #d4edda; color: #155724; }
    .status-delivered { background: #d4edda; color: #155724; }
    .status-cancelled { background: #f8d7da; color: #721c24; }

    .order-details {
      margin-bottom: 15px;
    }

    .order-total {
      font-size: 1.2rem;
      font-weight: bold;
      color: #28a745;
      margin: 5px 0;
    }

    .order-date {
      color: #666;
      margin: 5px 0;
    }

    .order-actions {
      display: flex;
      gap: 10px;
    }

    .btn-outline, .btn-primary {
      padding: 8px 16px;
      border: none;
      border-radius: 5px;
      cursor: pointer;
      text-decoration: none;
      display: inline-block;
      font-size: 0.9rem;
    }

    .btn-outline {
      background: transparent;
      border: 1px solid #667eea;
      color: #667eea;
    }

    .btn-outline:hover {
      background: #667eea;
      color: white;
    }

    .btn-primary {
      background: #667eea;
      color: white;
    }

    .btn-primary:hover {
      background: #5a67d8;
    }

    .empty-state {
      text-align: center;
      padding: 40px;
      color: #666;
    }

    .profile-info {
      margin-bottom: 20px;
    }

    .info-item {
      display: flex;
      justify-content: space-between;
      padding: 10px 0;
      border-bottom: 1px solid #e9ecef;
    }

    .info-item label {
      font-weight: bold;
      color: #2c3e50;
    }

    @media (max-width: 768px) {
      .dashboard-container {
        padding: 10px;
      }

      .dashboard-header {
        padding: 20px;
      }

      .dashboard-header h1 {
        font-size: 2rem;
      }

      .quick-actions {
        grid-template-columns: 1fr;
      }

      .orders-grid {
        grid-template-columns: 1fr;
      }

      .order-actions {
        flex-direction: column;
      }
    }
  `]
})
export class ClientDashboardComponent implements OnInit {
  customer: Customer | null = null;
  recentOrders: Order[] = [];
  loyaltyInfo: LoyaltyInfo | null = null;
  unreadMessages = 0;

  constructor(
    private customerAuth: CustomerAuthService,
    private orderService: OrderService,
    private messagingService: MessagingService,
    private router: Router
  ) {}

  ngOnInit() {
    this.customer = this.customerAuth.getCurrentCustomer();

    if (this.customer) {
      this.loadCustomerData();
    }
  }

  private loadCustomerData() {
    if (!this.customer || !this.customer.id) return;

    // Load recent orders
    this.customerAuth.getCustomerOrders(this.customer.id).subscribe({
      next: (orders) => {
        this.recentOrders = orders.slice(0, 6); // Show last 6 orders
      },
      error: (error) => console.error('Error loading orders:', error)
    });

    // Load loyalty info
    this.customerAuth.getLoyaltyPoints(this.customer.id).subscribe({
      next: (loyalty) => {
        this.loyaltyInfo = loyalty;
      },
      error: (error) => console.error('Error loading loyalty info:', error)
    });

    // Load unread messages count
    this.messagingService.getConversations(this.customer.id).subscribe({
      next: (conversations) => {
        this.unreadMessages = conversations.reduce((total, conv) => total + conv.unreadCount, 0);
      },
      error: (error) => console.error('Error loading conversations:', error)
    });
  }

  getProgressPercentage(): number {
    if (!this.loyaltyInfo || this.loyaltyInfo.nextLevelPoints === 0) return 100;

    const currentPoints = this.loyaltyInfo.points;
    const nextLevelPoints = this.loyaltyInfo.nextLevelPoints;

    // Calculate progress to next level
    const previousLevelPoints = this.getPreviousLevelPoints(this.loyaltyInfo.level);
    const progressRange = nextLevelPoints - previousLevelPoints;
    const currentProgress = currentPoints - previousLevelPoints;

    return Math.min((currentProgress / progressRange) * 100, 100);
  }

  private getPreviousLevelPoints(level: string): number {
    switch (level) {
      case 'bronze': return 0;
      case 'silver': return 100;
      case 'gold': return 500;
      case 'platinum': return 1000;
      default: return 0;
    }
  }

  getStatusLabel(status: string): string {
    const labels: { [key: string]: string } = {
      'pending': 'En attente',
      'confirmed': 'Confirmée',
      'shipped': 'Expédiée',
      'delivered': 'Livrée',
      'cancelled': 'Annulée'
    };
    return labels[status] || status;
  }

  canTrackOrder(order: Order): boolean {
    return ['shipped', 'delivered'].includes(order.status);
  }

  viewOrderDetails(order: Order) {
    this.router.navigate(['/client/orders', order.id]);
  }

  trackOrder(order: Order) {
    this.router.navigate(['/client/orders', order.id]);
  }

  editProfile() {
    this.router.navigate(['/client/profile']);
  }
}