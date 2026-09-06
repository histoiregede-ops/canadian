import { ChangeDetectorRef, Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';

import { CategoryService, Category } from '../../services/category';
import { ProductService } from '../../services/product';
import { RefreshService } from '../../services/refresh.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-categories',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './categories.component.html',
  styleUrls: ['./categories.component.css']
})
export class CategoriesComponent implements OnInit, OnDestroy {
  categories: Category[] = [];

  loading = true;
  showModal = false;
  isEditing = false;
  saving = false;
  deletingId: string | null = null;

  currentCategory: Category = this.initCategory();
  errorMessage = '';
  private refreshSub: Subscription | null = null;
  private productCounts: Map<string, number> = new Map();

  constructor(
    private route: ActivatedRoute,
    private categoryService: CategoryService,
    private productService: ProductService,
    private refreshService: RefreshService,
    private toastService: ToastService,
    private changeDetector: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.route.data.subscribe({
      next: ({ data }) => {
        if (data) {
          this.categories = data.categories || [];
          this.loading = false;
          this.loadProductCounts();
        }
      },
      error: () => {
        this.loading = false;
        this.loadCategories();
      }
    });
    this.refreshSub = this.refreshService.refresh$.subscribe(() => {
      this.loadCategories();
    });
  }

  ngOnDestroy(): void {
    this.refreshSub?.unsubscribe();
  }

  private initCategory(): Category {
    return {
      name: '',
      type: 'other'
    };
  }

  openAddModal(): void {
    this.isEditing = false;
    this.errorMessage = '';
    this.currentCategory = this.initCategory();
    this.showModal = true;
  }

  openEditModal(category: Category): void {
    this.isEditing = true;
    this.errorMessage = '';
    this.currentCategory = { ...category };
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
    this.errorMessage = '';
  }

  loadCategories(callback?: () => void): void {
    this.loading = true;
    this.categoryService.getCategories().subscribe({
      next: (data) => {
        this.categories = data;
        this.loading = false;
        this.loadProductCounts();
      },
      error: (err) => {
        console.error('Error loading categories:', err);
        this.loading = false;
      },
      complete: () => callback?.()
    });
  }

  loadProductCounts(): void {
    this.productService.getProducts().subscribe({
      next: (products) => {
        this.productCounts.clear();
        products.forEach(p => {
          if (p.categoryId) {
            this.productCounts.set(p.categoryId, (this.productCounts.get(p.categoryId) || 0) + 1);
          }
        });
      },
      error: (err) => console.error('Error loading products for category counts:', err)
    });
  }

  saveCategory(): void {
    if (this.saving) return;
    this.errorMessage = '';

    const name = (this.currentCategory.name || '').trim();
    if (!name) {
      this.errorMessage = 'Le nom de la catégorie est requis.';
      return;
    }

    const payload: Category = {
      name,
      type: this.currentCategory.type
    };
    const isEdit = !!(this.isEditing && this.currentCategory.id);
    const request$ = isEdit
      ? this.categoryService.updateCategory(this.currentCategory.id!, payload)
      : this.categoryService.createCategory(payload);

    this.saving = true;
    request$.pipe(finalize(() => { this.saving = false; this.changeDetector.detectChanges(); })).subscribe({
      next: (saved) => {
        if (isEdit) {
          this.categories = this.categories.map(c => c.id === saved.id ? { ...c, ...saved } : c);
        } else {
          this.categories = [saved, ...this.categories];
        }
        this.updateProductCountsFor(saved);
        this.showModal = false;
        this.changeDetector.detectChanges();
        this.refreshService.triggerRefresh();
        this.toastService.show(isEdit ? 'Catégorie modifiée avec succès.' : 'Catégorie créée avec succès.', 'success');
      },
      error: (err) => {
        console.error('Error saving category:', err);
        this.errorMessage = 'Impossible d\'enregistrer la catégorie.';
        this.toastService.show('Impossible d\'enregistrer la catégorie.', 'error');
      }
    });
  }

  deleteCategory(category: Category): void {
    if (!category.id || this.deletingId) return;

    if (confirm('Êtes-vous sûr de vouloir supprimer cette catégorie ?')) {
      this.deletingId = category.id;
      this.categoryService.deleteCategory(category.id)
        .pipe(finalize(() => { this.deletingId = null; this.changeDetector.detectChanges(); }))
        .subscribe({
          next: () => {
            this.categories = this.categories.filter(c => c.id !== category.id);
            this.changeDetector.detectChanges();
            this.refreshService.triggerRefresh();
            this.toastService.show('Catégorie supprimée avec succès.', 'success');
          },
          error: (err) => {
            console.error('Error deleting category:', err);
            this.errorMessage = 'Impossible de supprimer la catégorie.';
            this.toastService.show('Impossible de supprimer la catégorie.', 'error');
          }
        });
    }
  }

  private updateProductCountsFor(category: Category): void {
    if (!category.id) return;
    const existing = this.productCounts.get(category.id) || 0;
    this.productCounts.set(category.id, existing);
  }

  // Helper methods for the template
  getCategoryIcon(type: string): string {
    switch (type) {
      case 'solar': return '☀️';
      case 'electronics': return '🔌';
      case 'accessory': return '🔧';
      default: return '📦';
    }
  }

  getCategoryTypeLabel(type: string): string {
    switch (type) {
      case 'solar': return 'Solaire';
      case 'electronics': return 'Électronique';
      case 'accessory': return 'Accessoires';
      default: return 'Autre';
    }
  }

  getProductCount(categoryId?: string): number {
    if (!categoryId) return 0;
    return this.productCounts.get(categoryId) || 0;
  }

  formatDate(date?: Date | string): string {
    if (!date) return 'N/A';
    const d = new Date(date);
    return d.toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' });
  }
}

