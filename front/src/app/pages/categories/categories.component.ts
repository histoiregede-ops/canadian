import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';

import { CategoryService, Category } from '../../services/category';
import { ProductService } from '../../services/product';
import { RefreshService } from '../../services/refresh.service';

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

  currentCategory: Category = this.initCategory();
  errorMessage = '';
  private refreshSub: Subscription | null = null;
  private productCounts: Map<string, number> = new Map();

  constructor(private route: ActivatedRoute, private categoryService: CategoryService, private productService: ProductService, private refreshService: RefreshService) {}

  ngOnInit(): void {
    this.route.data.subscribe(({ data }) => {
      if (data) {
        this.categories = data.categories;
        this.loading = false;
        this.loadProductCounts();
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

  loadCategories(): void {
    this.loading = true;
    this.categoryService.getCategories().subscribe({
      next: (data) => {
        this.categories = data;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading categories:', err);
        this.loading = false;
      }
    });
    this.loadProductCounts();
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

    if (this.isEditing && this.currentCategory.id) {
      this.categoryService.updateCategory(this.currentCategory.id, payload).subscribe({
        next: () => {
          this.loadCategories();
          this.showModal = false;
        },
        error: (err) => {
          console.error('Error updating category:', err);
          this.errorMessage = 'Impossible de mettre à jour la catégorie.';
        }
      });
    } else {
      this.categoryService.createCategory(payload).subscribe({
        next: () => {
          this.loadCategories();
          this.showModal = false;
        },
        error: (err) => {
          console.error('Error creating category:', err);
          this.errorMessage = 'Impossible de créer la catégorie.';
        }
      });
    }
  }

  deleteCategory(category: Category): void {
    if (!category.id) return;

    if (confirm('Êtes-vous sûr de vouloir supprimer cette catégorie ?')) {
      this.categoryService.deleteCategory(category.id).subscribe({
        next: () => this.loadCategories(),
        error: (err) => {
          console.error('Error deleting category:', err);
          this.errorMessage = 'Impossible de supprimer la catégorie.';
        }
      });
    }
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

