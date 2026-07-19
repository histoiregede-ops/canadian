import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { MovementService, StockMovement, MovementsResponse, MovementSummary } from '../../services/movement';
import { ProductService } from '../../services/product';
import { MovementsResolved } from '../../resolvers/movements.resolver';

@Component({
  selector: 'app-movements',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './movements.component.html',
  styleUrls: ['./movements.component.css']
})
export class MovementsComponent implements OnInit {
  movements: StockMovement[] = [];
  summary: MovementSummary | null = null;
  products: any[] = [];
  reasons: string[] = [];

  loading = true;
  summaryLoading = true;

  filters = {
    productId: '',
    reason: '',
    startDate: '',
    endDate: '',
    page: 1,
    limit: 50
  };

  total = 0;
  pages = 1;
  currentPage = 1;

  constructor(
    private route: ActivatedRoute,
    private movementService: MovementService,
    private productService: ProductService
  ) {}

  ngOnInit(): void {
    const resolved = this.route.snapshot.data['data'] as MovementsResolved | undefined;
    this.products = resolved?.products || [];
    this.reasons = resolved?.reasons || [];

    this.route.queryParams.subscribe(params => {
      if (params['productId']) {
        this.filters.productId = params['productId'];
      }
      this.loadMovements();
      this.loadSummary();
    });
  }

  private loadMovements(): void {
    this.loading = true;
    this.movementService.getMovements(this.filters).subscribe({
      next: (data) => {
        this.movements = data.movements;
        this.total = data.total;
        this.pages = data.pages;
        this.currentPage = data.page;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  private loadSummary(): void {
    this.summaryLoading = true;
    this.movementService.getMovementsSummary(this.filters).subscribe({
      next: (data) => {
        this.summary = data;
        this.summaryLoading = false;
      },
      error: () => {
        this.summaryLoading = false;
      }
    });
  }

  onFilterChange(): void {
    this.filters.page = 1;
    this.loadMovements();
    this.loadSummary();
  }

  resetFilters(): void {
    this.filters = {
      productId: '',
      reason: '',
      startDate: '',
      endDate: '',
      page: 1,
      limit: 50
    };
    this.loadMovements();
    this.loadSummary();
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.pages) return;
    this.filters.page = page;
    this.loadMovements();
  }

  getReasonLabel(reason: string): string {
    const labels: { [key: string]: string } = {
      restock: 'Réapprovisionnement',
      adjustment: 'Ajustement manuel',
      sale: 'Vente',
      return: 'Retour',
      manual: 'Manuel'
    };
    return labels[reason] || reason;
  }

  getReasonBadgeClass(reason: string): string {
    const map: { [key: string]: string } = {
      restock: 'reason-restock',
      adjustment: 'reason-adjustment',
      sale: 'reason-sale',
      return: 'reason-return',
      manual: 'reason-manual'
    };
    return map[reason] || 'reason-manual';
  }

  getProductName(productId: string): string {
    const product = this.products.find(p => p.id === productId);
    return product?.name || 'Produit inconnu';
  }

  getCategoryName(category: any): string {
    return category?.name || 'N/A';
  }

  formatNumber(value: number): string {
    return Math.round(value || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  }

  getReasonCount(reason: string): number {
    return this.summary?.byReason?.find(r => r.reason === reason)?.count || 0;
  }
}
