import { Component, OnInit, OnDestroy, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { Subscription } from 'rxjs';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Chart, registerables } from 'chart.js';

import { environment } from '../../../environments/environment';
import { Category, CategoryService } from '../../services/category';
import { Product, StockMovement, ProductService } from '../../services/product';
import { WebSocketService } from '../../services/websocket';

Chart.register(...registerables);

@Component({
  selector: 'app-inventory',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './inventory.component.html',
  styleUrls: ['./inventory.component.css'],
})
export class InventoryComponent implements OnInit, OnDestroy, AfterViewInit {
  products: Product[] = [];
  categories: Category[] = [];

  searchQuery = '';
  selectedCategoryId = '';
  selectedStatus: string = '';

  @ViewChild('stockCategoryChart') private categoryChartRef!: ElementRef;
  @ViewChild('stockStatusChart') private statusChartRef!: ElementRef;
  private categoryChart: any;
  private statusChart: any;

  get filteredProducts(): Product[] {
    const q = (this.searchQuery || '').toLowerCase();

    return this.products.filter((p) => {
      const matchesQuery =
        !q ||
        (p.name || '').toLowerCase().includes(q) ||
        (p.description || '').toLowerCase().includes(q);
      const matchesCategory =
        !this.selectedCategoryId || p.categoryId === this.selectedCategoryId;
      const matchesStatus = !this.selectedStatus || p.status === this.selectedStatus;

      return matchesQuery && matchesCategory && matchesStatus;
    });
  }

  get finishedProducts(): Product[] {
    const threshold = this.selectedCategoryId ? 0 : 15;
    return this.products
      .filter((p) => p.stockQuantity <= threshold)
      .sort((a, b) => a.stockQuantity - b.stockQuantity);
  }

  get lowStockCount(): number {
    return this.products.filter(p => p.stockQuantity > 0 && p.stockQuantity <= 15).length;
  }

  get outOfStockCount(): number {
    return this.products.filter(p => p.stockQuantity === 0).length;
  }

  loading = true;
  showModal = false;
  showMoveModal = false;
  showHistoryModal = false;
  isEditing = false;

  historyProductName = '';
  movements: StockMovement[] = [];
  loadingMovements = false;

  toastMessage = '';
  toastType: 'low_stock' | 'out_of_stock' | '' = '';
  toastTimeout: any = null;

  // Notification subscription
  private wsSub: Subscription | null = null;

  // Form Model
  currentProduct: Product = this.initProduct();

  constructor(
    private productService: ProductService,
    private categoryService: CategoryService,
    private wsService: WebSocketService
  ) { }

  ngOnInit(): void {
    this.loadProducts();
    this.loadCategories();
    this.listenNotifications();
  }

  ngOnDestroy(): void {
    this.wsSub?.unsubscribe();
    if (this.toastTimeout) clearTimeout(this.toastTimeout);
  }

  private listenNotifications(): void {
    this.wsSub = this.wsService.notification$.subscribe(notif => {
      if (notif) this.showToast(notif.title + ': ' + notif.body, notif.type);
    });
  }

  private showToast(message: string, type: string): void {
    this.toastMessage = message;
    this.toastType = type as any;
    if (this.toastTimeout) clearTimeout(this.toastTimeout);
    this.toastTimeout = setTimeout(() => {
      this.toastMessage = '';
      this.toastType = '';
    }, 5000);
  }

  dismissToast(): void {
    this.toastMessage = '';
    this.toastType = '';
    if (this.toastTimeout) clearTimeout(this.toastTimeout);
  }

  ngAfterViewInit(): void {
    this.updateCharts();
  }

  initProduct(): Product {
    return {
      name: '',
      description: '',
      price: 0,
      stockQuantity: 0,
      status: 'available',
      categoryId: '',
      photo: '',
    };
  }

  // Méthode pour capturer l'image sélectionnée et la convertir en Base64
  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 800;
          const MAX_HEIGHT = 800;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);

          // Compression en JPEG (qualité 0.7) pour réduire drastiquement la taille du payload
          this.currentProduct.photo = canvas.toDataURL('image/jpeg', 0.7);
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }

  loadCategories(): void {
    this.categoryService.getCategories().subscribe((data: Category[]) => {
      this.categories = data;
    });
  }

  loadProducts(): void {
    this.loading = true;
    this.productService.getProducts().subscribe({
      next: (data) => {
        this.products = data;
        this.loading = false;
        this.updateCharts();
      },
      error: (err) => {
        console.error('Error loading products:', err);
        this.loading = false;
      },
    });
  }

  // Résout l'URL de l'image pour l'affichage
  getProductImage(photo: string): string {
    if (!photo) return '';
    if (photo.startsWith('data:image')) return photo;
    if (photo.includes('cloudinary.com')) return photo;
    const baseUrl = environment.apiUrl;
    return photo.startsWith('/') ? `${baseUrl}${photo}` : `${baseUrl}/${photo}`;
  }

  openAddModal(): void {
    this.isEditing = false;
    this.currentProduct = this.initProduct();
    this.showModal = true;
  }

  openEditModal(product: Product): void {
    this.isEditing = true;
    this.currentProduct = { ...product };
    this.showModal = true;
  }

  // Quick restock: add quantity and update local array instantly
  restockProduct(product: Product): void {
    const qty = prompt(`Quantite a ajouter a "${product.name}" :`, '1');
    if (!qty) return;
    const num = parseInt(qty, 10);
    if (isNaN(num) || num <= 0) {
      alert('Veuillez entrer une quantite valide');
      return;
    }
    this.productService.restockProduct(product.id!, num).subscribe({
      next: (updated) => {
        const idx = this.products.findIndex(p => p.id === product.id);
        if (idx !== -1) {
          this.products[idx] = { ...this.products[idx], stockQuantity: updated.stockQuantity, status: updated.status };
          this.products = [...this.products];
        }
      },
      error: (err) => {
        console.error('Error restocking:', err);
        alert('Erreur lors du reapprovisionnement');
      }
    });
  }

  // Open movement history modal
  openHistory(product: Product): void {
    this.historyProductName = product.name || '';
    this.movements = [];
    this.showHistoryModal = true;
    this.loadingMovements = true;
    this.productService.getMovements(product.id!).subscribe({
      next: (data) => {
        this.movements = data;
        this.loadingMovements = false;
      },
      error: (err) => {
        console.error('Error loading movements:', err);
        this.loadingMovements = false;
      }
    });
  }

  // Returns label for movement reason
  reasonLabel(reason: string): string {
    const map: {[key: string]: string} = {
      'restock': 'Reapprovisionnement',
      'adjustment': 'Ajustement manuel',
      'sale': 'Vente',
      'return': 'Retour',
      'manual': 'Manuel'
    };
    return map[reason] || reason;
  }

  saveProduct(): void {
    // Photo required only for new products, not edits
    if (!this.isEditing && !this.currentProduct.photo) {
      alert("L'insertion d'une image est obligatoire pour enregistrer un produit !");
      return;
    }

    if (this.isEditing && this.currentProduct.id) {
      this.productService
        .updateProduct(this.currentProduct.id, this.currentProduct)
        .subscribe({
          next: () => {
            this.loadProducts();
            this.showModal = false;
          },
          error: (err) => {
            console.error('Erreur lors de la modification:', err);
            alert('Erreur lors de la mise à jour du produit.');
          }
        });
    } else {
      this.productService.createProduct(this.currentProduct).subscribe({
        next: () => {
          this.loadProducts();
          this.showModal = false;
        },
        error: (err) => {
          console.error('Erreur lors de la création:', err);
          alert('Erreur lors de la création du produit.');
        }
      });
    }
  }

  deleteProduct(id: string): void {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce produit ?')) {
      this.productService.deleteProduct(id).subscribe({
        next: () => {
          this.loadProducts();
        },
        error: (err) => {
          console.error('Erreur lors de la suppression:', err);
          alert('Impossible de supprimer ce produit. Il est peut-être lié à une commande.');
        }
      });
    }
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'available':
      case 'completed':
        return 'available';
      case 'out_of_stock':
      case 'cancelled':
        return 'out';
      case 'on_order':
      case 'pending':
        return 'low';
      default:
        return '';
    }
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'available':
        return 'En stock';
      case 'out_of_stock':
        return 'Rupture';
      case 'on_order':
        return 'Sur commande';
      default:
        return status;
    }
  }

  private updateCharts(): void {
    if (this.products.length === 0 || !this.categoryChartRef || !this.statusChartRef) return;

    if (this.categoryChart) this.categoryChart.destroy();
    if (this.statusChart) this.statusChart.destroy();

    this.renderCategoryChart();
    this.renderStatusChart();
  }

  private renderCategoryChart(): void {
    const categoryCounts: { [key: string]: number } = {};
    this.products.forEach(p => {
      const cat = this.categories.find(c => c.id === p.categoryId);
      const name = cat ? cat.name : 'Inconnu';
      categoryCounts[name] = (categoryCounts[name] || 0) + 1;
    });

    this.categoryChart = new Chart(this.categoryChartRef.nativeElement, {
      type: 'bar',
      data: {
        labels: Object.keys(categoryCounts),
        datasets: [{
          label: 'Nombre de produits',
          data: Object.values(categoryCounts),
          backgroundColor: '#2563eb',
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: true, grid: { color: '#f1f5f9' } },
          x: { grid: { display: false } }
        }
      }
    });
  }

  private renderStatusChart(): void {
    const statusCounts = {
      available: 0,
      low: 0,
      out: 0
    };

    this.products.forEach(p => {
      if (p.stockQuantity === 0) statusCounts.out++;
      else if (p.stockQuantity <= 15) statusCounts.low++;
      else statusCounts.available++;
    });

    this.statusChart = new Chart(this.statusChartRef.nativeElement, {
      type: 'doughnut',
      data: {
        labels: ['En Stock', 'Stock Faible', 'Rupture'],
        datasets: [{
          data: [statusCounts.available, statusCounts.low, statusCounts.out],
          backgroundColor: ['#22c55e', '#f59e0b', '#ef4444'],
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: { usePointStyle: true, padding: 15 }
          }
        },
        cutout: '70%'
      }
    });
  }
}
