import { ChangeDetectorRef, Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { ActivatedRoute } from '@angular/router';
import { Supplier, SupplierService } from '../../services/supplier';
import { ProductService } from '../../services/product';
import { RefreshService } from '../../services/refresh.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-suppliers',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './suppliers.component.html',
  styleUrls: ['./suppliers.component.css']
})
export class SuppliersComponent implements OnInit, OnDestroy {
  suppliers: Supplier[] = [];
  filteredSuppliers: Supplier[] = [];
  supplierProductCounts: { [key: string]: number } = {};
  searchQuery = '';
  loading = true;
  showModal = false;
  isEditing = false;
  saving = false;
  deletingId: string | null = null;
  currentSupplier: Supplier = this.emptySupplier();
  private refreshSub?: Subscription;

  constructor(
    private route: ActivatedRoute,
    private supplierService: SupplierService,
    private productService: ProductService,
    private refreshService: RefreshService,
    private toastService: ToastService,
    private changeDetector: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.route.data.subscribe(({ data }) => {
      if (data) {
        this.suppliers = data.suppliers;
        this.loadProductCounts();
        this.applyFilter();
        this.loading = false;
      }
    });
    this.refreshSub = this.refreshService.refresh$.subscribe(() => this.loadSuppliers());
  }

  ngOnDestroy(): void {
    this.refreshSub?.unsubscribe();
  }

  loadSuppliers(callback?: () => void): void {
    this.loading = true;
    this.supplierService.getSuppliers().subscribe({
      next: (data) => {
        this.suppliers = data;
        this.loadProductCounts();
        this.applyFilter();
        this.loading = false;
        callback?.();
      },
      error: () => {
        this.loading = false;
        callback?.();
      }
    });
  }

  private loadProductCounts(): void {
    this.productService.getProducts().subscribe({
      next: (products) => {
        const counts: { [key: string]: number } = {};
        products.forEach(p => {
          if (p.supplierId) {
            const key = String(p.supplierId);
            counts[key] = (counts[key] || 0) + 1;
          }
        });
        this.supplierProductCounts = counts;
      },
      error: (err) => console.error('Erreur chargement compteurs produits:', err)
    });
  }

  trackBySupplierId(index: number, item: any): string {
    return item?.id ?? index;
  }

  private applyFilter(): void {
    const q = this.searchQuery.toLowerCase();
    this.filteredSuppliers = q
      ? this.suppliers.filter(s => s.name.toLowerCase().includes(q) || s.contactName?.toLowerCase().includes(q) || s.email?.toLowerCase().includes(q))
      : this.suppliers;
  }

  onSearch(): void { this.applyFilter(); }

  openAddModal(): void {
    this.isEditing = false;
    this.currentSupplier = this.emptySupplier();
    this.showModal = true;
  }

  openEditModal(supplier: Supplier): void {
    this.isEditing = true;
    this.currentSupplier = { ...supplier };
    this.showModal = true;
  }

  saveSupplier(): void {
    if (this.saving) return;
    this.saving = true;
    const isEdit = !!(this.isEditing && this.currentSupplier.id);
    const payload = { ...this.currentSupplier };
    const request$ = isEdit
      ? this.supplierService.updateSupplier(this.currentSupplier.id!, payload)
      : this.supplierService.createSupplier(payload);

    request$
      .pipe(finalize(() => { this.saving = false; this.changeDetector.detectChanges(); }))
      .subscribe({
        next: (saved) => {
          if (isEdit) {
            this.suppliers = this.suppliers.map(s => s.id === saved.id ? { ...s, ...saved } : s);
          } else {
            this.suppliers = [saved, ...this.suppliers];
          }
          this.applyFilter();
          this.showModal = false;
          this.changeDetector.detectChanges();
          this.refreshService.triggerRefresh();
          this.toastService.show(isEdit ? 'Fournisseur modifié avec succès.' : 'Fournisseur créé avec succès.', 'success');
        },
        error: (err) => this.toastService.show(this.errorMessage(err), 'error')
      });
  }

  deleteSupplier(id: string): void {
    if (this.deletingId || !confirm('Supprimer ce fournisseur ?')) return;
    this.deletingId = id;
    this.supplierService.deleteSupplier(id)
      .pipe(finalize(() => { this.deletingId = null; }))
      .subscribe({
        next: () => {
          this.suppliers = this.suppliers.filter(s => s.id !== id);
          this.applyFilter();
          this.refreshService.triggerRefresh();
          this.toastService.show('Fournisseur supprimé avec succès.', 'success');
        },
        error: (err) => this.toastService.show(this.errorMessage(err), 'error')
      });
  }

  private errorMessage(err: any): string {
    if (err?.error?.error) return 'Erreur: ' + String(err.error.error);
    if (err?.error?.message) return 'Erreur: ' + String(err.error.message);
    if (typeof err?.error === 'string') return 'Erreur: ' + err.error;
    const msg = err?.error instanceof ErrorEvent ? err.error.message : err?.message;
    const status = err?.status;
    if (!status) return msg || 'Erreur réseau. Réessayez.';
    switch (status) {
      case 400: return 'Erreur: le serveur a refusé la demande.';
      case 401: return 'Erreur: session expirée. Veuillez vous reconnecter.';
      case 403: return 'Erreur: accès refusé.';
      case 404: return 'Erreur: élément introuvable.';
      case 409: return 'Erreur: ce fournisseur existe déjà avec ces informations.';
      case 500: return 'Erreur: problème serveur. Réessayez plus tard.';
      default: return msg || `Erreur (${status}).`;
    }
  }

  private emptySupplier(): Supplier {
    return { name: '', contactName: '', email: '', phone: '', address: '', city: '', country: 'France', productTypes: '', isActive: true };
  }
}
