import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { ActivatedRoute } from '@angular/router';
import { Supplier, SupplierService } from '../../services/supplier';
import { ProductService } from '../../services/product';
import { RefreshService } from '../../services/refresh.service';

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
  currentSupplier: Supplier = this.emptySupplier();
  private refreshSub?: Subscription;

  constructor(
    private route: ActivatedRoute,
    private supplierService: SupplierService,
    private productService: ProductService,
    private refreshService: RefreshService
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

  loadSuppliers(): void {
    this.loading = true;
    this.supplierService.getSuppliers().subscribe({
      next: (data) => {
        this.suppliers = data;
        this.loadProductCounts();
        this.applyFilter();
        this.loading = false;
      },
      error: () => { this.loading = false; }
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
      }
    });
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
    if (this.isEditing && this.currentSupplier.id) {
      this.supplierService.updateSupplier(this.currentSupplier.id, this.currentSupplier).subscribe({
        next: () => { this.showModal = false; this.loadSuppliers(); },
        error: (err) => alert('Erreur: ' + err.error?.error || err.message)
      });
    } else {
      this.supplierService.createSupplier(this.currentSupplier).subscribe({
        next: () => { this.showModal = false; this.loadSuppliers(); },
        error: (err) => alert('Erreur: ' + err.error?.error || err.message)
      });
    }
  }

  deleteSupplier(id: string): void {
    if (confirm('Supprimer ce fournisseur ?')) {
      this.supplierService.deleteSupplier(id).subscribe({
        next: () => this.loadSuppliers(),
        error: (err) => alert('Erreur: ' + err.error?.error || err.message)
      });
    }
  }

  private emptySupplier(): Supplier {
    return { name: '', contactName: '', email: '', phone: '', address: '', city: '', country: 'France', productTypes: '', isActive: true };
  }
}
