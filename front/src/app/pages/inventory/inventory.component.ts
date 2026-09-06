import { Component, OnInit, OnDestroy, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { Subscription } from 'rxjs';
import { finalize } from 'rxjs/operators';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Chart, registerables } from 'chart.js';
import { ActivatedRoute } from '@angular/router';

import { environment } from '../../../environments/environment';
import { Category, CategoryService } from '../../services/category';
import { Product, StockMovement, ProductService } from '../../services/product';
import { SupplierService } from '../../services/supplier';
import { WebSocketService } from '../../services/websocket';
import { RefreshService } from '../../services/refresh.service';
import { ToastService } from '../../services/toast.service';
import { BarcodeService } from '../../services/barcode.service';

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
  suppliers: any[] = [];

  searchQuery = '';
  selectedCategoryId = '';
  selectedSupplierId = '';
  selectedStatus: string = '';
  saving = false;
  private saveWatchdog: ReturnType<typeof setTimeout> | null = null;
  deletingId: string | null = null;
  imgErrors = new Set<string>();
  selectedFile: File | null = null;
  photoPreview: string = '';

  onImgError(productId: string): void {
    this.imgErrors.add(productId);
  }

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
        (p.description || '').toLowerCase().includes(q) ||
        (p.barcode || '').toLowerCase().includes(q);
      const matchesCategory =
        !this.selectedCategoryId || p.categoryId === this.selectedCategoryId;
      const matchesSupplier =
        !this.selectedSupplierId || p.supplierId === Number(this.selectedSupplierId);
      const matchesStatus = !this.selectedStatus || p.status === this.selectedStatus;

      return matchesQuery && matchesCategory && matchesSupplier && matchesStatus;
    });
  }

  get finishedProducts(): Product[] {
    const threshold = this.selectedCategoryId ? 0 : 15;
    return this.products
      .filter((p) => p.stockQuantity <= (p.lowStockThreshold || threshold))
      .sort((a, b) => a.stockQuantity - b.stockQuantity);
  }

  get lowStockCount(): number {
    return this.products.filter(p => p.stockQuantity > 0 && p.stockQuantity <= (p.lowStockThreshold || 15)).length;
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

  // Barcode scanning
  isScanning = false;

  // Notification subscription
  private wsSub: Subscription | null = null;
  private refreshSub: Subscription | null = null;

  currentProduct: Product = this.initProduct();

  constructor(
    private route: ActivatedRoute,
    private productService: ProductService,
    private categoryService: CategoryService,
    private supplierService: SupplierService,
    private wsService: WebSocketService,
    private refreshService: RefreshService,
    private toastService: ToastService,
    private barcodeService: BarcodeService
  ) { }

  ngOnInit(): void {
    this.route.data.subscribe(({ data }) => {
      if (data) {
        this.products = data.products;
        this.loading = false;
        this.updateCharts();
      }
    });
    this.loadCategories();
    this.loadSuppliers();
    this.listenNotifications();
    this.refreshSub = this.refreshService.refresh$.subscribe(() => {
      this.loadProducts();
    });
  }

  ngOnDestroy(): void {
    this.wsSub?.unsubscribe();
    this.refreshSub?.unsubscribe();
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

  trackByCategoryId(index: number, item: any): string {
    return item?.id ?? index;
  }

  trackBySupplierId(index: number, item: any): string {
    return item?.id ?? index;
  }

  trackByProductId(index: number, item: any): string {
    return item?.id ?? index;
  }

  trackByMovementId(index: number, item: any): string {
    return item?.id ?? index;
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
      barcode: this.generateBarcode(),
      price: 0,
      stockQuantity: 0,
      status: 'available',
      categoryId: '',
      supplierId: undefined,
      photo: '',
    };
  }

  private buildFormData(): FormData {
    const fd = new FormData();
    fd.append('name', this.currentProduct.name);
    fd.append('description', this.currentProduct.description || '');
    fd.append('price', String(this.currentProduct.price));
    fd.append('stockQuantity', String(this.currentProduct.stockQuantity));
    fd.append('status', this.currentProduct.status);
    if (this.currentProduct.categoryId) fd.append('categoryId', this.currentProduct.categoryId);
    if (this.currentProduct.supplierId) fd.append('supplierId', String(this.currentProduct.supplierId));
    if (this.selectedFile) fd.append('photo', this.selectedFile);
    return fd;
  }

  private generateBarcode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const part1 = Array.from({ length: 3 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    const part2 = Array.from({ length: 3 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    const part3 = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    return `ELEC-${part1}-${part2}-${part3}`;
  }

  async onFileSelected(event: any): Promise<void> {
    const file = event.target.files[0];
    if (!file) {
      this.selectedFile = null;
      this.photoPreview = '';
      return;
    }
    this.selectedFile = null;
    this.photoPreview = '';
    try {
      const compressed = await this.compressImage(file);
      const before = Math.round(file.size / 1024);
      const after = Math.round(compressed.size / 1024);
      const gain = before > 0 ? Math.round((1 - after / before) * 100) : 0;
      console.log(`[Image] ${before} KB -> ${after} KB (gain ${gain} %)`);
      this.selectedFile = compressed;
      this.photoPreview = URL.createObjectURL(compressed);
    } catch (err) {
      console.error('[Image] Compression impossible, utilisation de l\'originale:', err);
      this.selectedFile = file;
      this.photoPreview = URL.createObjectURL(file);
      this.toastService.show('Compression impossible, image originale utilisée', 'warning');
    }
  }

  private compressImage(file: File, maxDim = 800, quality = 0.8): Promise<File> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        try {
          const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
          const w = Math.max(1, Math.round(img.width * scale));
          const h = Math.max(1, Math.round(img.height * scale));
          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          if (!ctx) throw new Error('Canvas 2D non supporté');
          ctx.fillStyle = '#fff';
          ctx.fillRect(0, 0, w, h);
          ctx.drawImage(img, 0, 0, w, h);
          canvas.toBlob((blob) => {
            if (!blob) {
              reject(new Error('toBlob a échoué'));
              return;
            }
            const base = file.name.replace(/\.[^.]+$/, '') || 'photo';
            resolve(new File([blob], `${base}.jpg`, { type: 'image/jpeg' }));
          }, 'image/jpeg', quality);
        } catch (e) {
          reject(e);
        } finally {
          URL.revokeObjectURL(url);
        }
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Image invalide'));
      };
      img.src = url;
    });
  }

  loadCategories(): void {
    this.categoryService.getCategories().subscribe((data: Category[]) => {
      this.categories = data;
    });
  }

  loadSuppliers(): void {
    this.supplierService.getSuppliers().subscribe((data: any[]) => {
      this.suppliers = data;
    });
  }

  loadProducts(callback?: () => void): void {
    this.loading = true;
    this.productService.getProducts().subscribe({
      next: (data) => {
        this.products = data;
        this.loading = false;
        this.updateCharts();
        callback?.();
      },
      error: (err) => {
        console.error('Error loading products:', err);
        this.loading = false;
        callback?.();
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
    this.selectedFile = null;
    this.photoPreview = '';
    this.showModal = true;
  }

  openEditModal(product: Product): void {
    this.isEditing = true;
    this.currentProduct = { ...product };
    this.selectedFile = null;
    this.photoPreview = '';
    this.showModal = true;
  }

  // Quick restock: add quantity and update local array instantly
  restockProduct(product: Product): void {
    const qty = prompt(`Quantite a ajouter a "${product.name}" :`, '1');
    if (!qty) return;
    const num = parseInt(qty, 10);
    if (isNaN(num) || num <= 0) {
      this.toastService.show('Veuillez entrer une quantite valide', 'warning');
      return;
    }
    this.productService.restockProduct(product.id!, num).subscribe({
      next: (updated) => {
        const idx = this.products.findIndex(p => p.id === product.id);
        if (idx !== -1) {
          this.products[idx] = { ...this.products[idx], stockQuantity: updated.stockQuantity, status: updated.status };
          this.products = [...this.products];
        }
        this.refreshService.triggerRefresh();
        this.toastService.show('Reapprovisionnement effectué', 'success');
      },
      error: (err) => {
        console.error('Error restocking:', err);
        this.toastService.show('Erreur lors du reapprovisionnement', 'error');
      }
    });
  }

  adjustStock(product: Product): void {
    const qty = prompt(`Nouvelle quantite en stock pour "${product.name}" :`, String(product.stockQuantity));
    if (qty === null) return;
    const num = parseInt(qty, 10);
    if (isNaN(num) || num < 0) {
      this.toastService.show('Veuillez entrer une quantite valide', 'warning');
      return;
    }
    const reason = prompt('Raison de l\'ajustement (optionnel):', 'Ajustement manuel') || 'Ajustement manuel';
    this.productService.adjustStock(product.id!, num, reason).subscribe({
      next: (updated) => {
        const idx = this.products.findIndex(p => p.id === product.id);
        if (idx !== -1) {
          this.products[idx] = { ...this.products[idx], stockQuantity: updated.stockQuantity, status: updated.status };
          this.products = [...this.products];
        }
        this.refreshService.triggerRefresh();
        this.toastService.show('Stock ajusté', 'success');
      },
      error: (err) => {
        console.error('Error adjusting stock:', err);
        this.toastService.show('Erreur lors de l\'ajustement du stock', 'error');
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

  startBarcodeScan(): void {
    if (this.isScanning) return;
    this.isScanning = true;
    const code = prompt('Entrez le code-barres manuellement ou scannez:');
    if (code) {
      this.currentProduct.barcode = code;
      const existing = this.products.find(p => p.barcode === code);
      if (existing) {
        if (confirm(`Produit trouvé: ${existing.name}. Ouvrir ?`)) {
          this.openEditModal(existing);
        }
      }
    }
    this.isScanning = false;
  }

  saveProduct(event?: Event): void {
    event?.preventDefault();
    if (this.saving) return;
    this.saving = true;
    const startTime = performance.now();
    const label = this.isEditing ? 'Mise à jour produit' : 'Création produit';

    try {
      if (!this.isEditing && !this.selectedFile) {
        this.toastService.show("L'insertion d'une image est obligatoire pour enregistrer un produit !", 'warning');
        this.saving = false;
        return;
      }

      const fd = this.buildFormData();
      const request$ = this.isEditing && this.currentProduct.id
        ? this.productService.updateProduct(this.currentProduct.id, fd)
        : this.productService.createProduct(fd);
      let saveTimedOut = false;
      this.saveWatchdog = setTimeout(() => {
        if (!this.saving) return;
        saveTimedOut = true;
        this.saving = false;
        this.showModal = false;
        this.loadProducts(() => {
          this.toastService.show('Le serveur a tardé à répondre. La liste a été rechargée pour vérifier le produit.', 'warning');
        });
      }, 12000);

      request$.pipe(
        finalize(() => {
          if (this.saveWatchdog) {
            clearTimeout(this.saveWatchdog);
            this.saveWatchdog = null;
          }
          this.saving = false;
          this.selectedFile = null;
          this.photoPreview = '';
        })
      ).subscribe({
        next: (saved) => {
          if (saveTimedOut) return;
          const apiTime = performance.now() - startTime;
          console.log(`[Produit] ${label} — API répond en ${this.formatDuration(apiTime)}`);
          this.saving = false;
          this.showModal = false;
          if (this.isEditing && saved.id) {
            this.products = this.products.map(p => p.id === saved.id ? { ...p, ...saved } : p);
          } else {
            this.products = [saved, ...this.products];
          }
          try {
            this.updateCharts();
          } catch (chartError) {
            console.error('[Produit] Graphiques non actualisés après sauvegarde:', chartError);
          }
          const totalTime = performance.now() - startTime;
          console.log(`[Produit] ${label} — TERMINÉ en ${this.formatDuration(totalTime)}`);
          if (this.isEditing) {
            this.refreshService.triggerRefresh();
            this.toastService.show('Produit mis à jour', 'success');
          } else {
            this.toastService.show('Produit créé', 'success');
          }
        },
        error: (err) => {
          const elapsed = performance.now() - startTime;
          console.error(`[Produit] ${label} — ÉCHEC après ${this.formatDuration(elapsed)} :`, err);
          const isTimeout = err?.name === 'TimeoutError' || String(err?.message || '').includes('Timeout');
          if (isTimeout) {
            saveTimedOut = true;
            this.showModal = false;
            this.loadProducts(() => {
              this.toastService.show('Le serveur a tardé à répondre. La liste a été rechargée pour vérifier le produit.', 'warning');
            });
            return;
          }
          const msg = isTimeout
            ? `Le serveur n'a pas répondu après ${this.formatDuration(elapsed)}. Vérifie ta connexion (et le throttling réseau des DevTools).`
            : (err?.error?.error || err?.error?.message || err?.message || 'Erreur lors de la création du produit.');
          this.toastService.show(String(msg), 'error');
        }
      });
    } catch (err: any) {
      const elapsed = performance.now() - startTime;
      console.error(`[Produit] ${label} — EXCEPTION après ${this.formatDuration(elapsed)} :`, err);
      this.toastService.show(err?.message || 'Erreur lors de la création du produit.', 'error');
      this.saving = false;
    }
  }

  private formatDuration(ms: number): string {
    if (!isFinite(ms) || ms < 0) return 'durée invalide';
    const seconds = ms / 1000;
    if (seconds < 1) return `${Math.round(ms)} ms`;
    const min = Math.floor(seconds / 60);
    const sec = (seconds % 60).toFixed(1);
    return min > 0 ? `${min} min ${sec} s` : `${sec} s`;
  }

  deleteProduct(id: string): void {
    if (this.deletingId || !confirm('Êtes-vous sûr de vouloir supprimer ce produit ?')) return;
    this.deletingId = id;
    this.productService.deleteProduct(id)
      .pipe(finalize(() => { this.deletingId = null; }))
      .subscribe({
        next: () => {
          this.products = this.products.filter(p => p.id !== id);
          this.updateCharts();
          this.refreshService.triggerRefresh();
          this.toastService.show('Produit supprimé', 'success');
        },
        error: (err) => {
          console.error('Erreur lors de la suppression:', err);
          this.toastService.show('Impossible de supprimer ce produit. Il est peut-être lié à une commande.', 'error');
        }
      });
  }

  downloadBarcode(product: Product): void {
    const code = product.barcode || product.id || '';
    if (!code) {
      this.toastService.show('Ce produit n\'a pas de code-barres.', 'warning');
      return;
    }
    const filename = `${product.name.replace(/[^a-zA-Z0-9]/g, '_')}_${code}`;
    this.barcodeService.downloadBarcode(code, filename);
  }

  getBarcodePreview(code: string): string {
    if (!code) return '';
    return this.barcodeService.generateBarcodeDataUrl(code);
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
      const threshold = p.lowStockThreshold || 15;
      if (p.stockQuantity === 0) statusCounts.out++;
      else if (p.stockQuantity <= threshold) statusCounts.low++;
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
