import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';

import { environment } from '../../../environments/environment';
import { Category, CategoryService } from '../../services/category';
import { CartService } from '../../services/cart';
import { Product, ProductService } from '../../services/product';
import {
  ProductReviewService,
  ProductReviewsResponse,
} from '../../services/product-review';

export interface ProductWithReviews extends Product {
  // Ajout d'informations attendues par le template
  reviews?: ProductReviewsResponse;
  showReviews?: boolean;
}

@Component({
  selector: 'app-shop',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './shop.component.html',
  styleUrls: ['./shop.component.css'],
})
export class ShopComponent implements OnInit {
  products: ProductWithReviews[] = [];
  categories: Category[] = [];

  searchQuery = '';
  selectedCategoryId = '';
  sortBy: 'name' | 'price-low' | 'price-high' | 'rating' = 'name';

  loading = true;

  whatsappNumber = '+22879803856';

  constructor(
    private productService: ProductService,
    private categoryService: CategoryService,
    private cartService: CartService,
    private reviewService: ProductReviewService,
    private router: Router
  ) {}

  getWhatsAppLink(product: Product): string {
    const message = `Bonjour, je suis intéressé par le produit ${product.name}. Pouvez-vous m'envoyer plus d'informations ?`;
    return `https://wa.me/${this.whatsappNumber.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
  }

  ngOnInit(): void {
    this.loadProducts();
    this.loadCategories();
  }

  loadProducts(): void {
    this.loading = true;
    this.productService.getProducts().subscribe({
      next: (data) => {
        this.products = data
          .filter((p) => p.status === 'available')
          .map((p) => ({ ...p, showReviews: false }));

        this.applySorting();
        this.loading = false;

        this.loadProductReviews();
      },
      error: (err) => {
        console.error('Error loading products:', err);
        this.loading = false;
      },
    });
  }

  loadCategories(): void {
    this.categoryService.getCategories().subscribe({
      next: (data) => {
        this.categories = data;
      },
      error: (err) => console.error('Error loading categories:', err),
    });
  }

  loadProductReviews(): void {
    this.products.forEach((product) => {
      if (!product.id) return;

      this.reviewService.getProductReviews(product.id, 1, 3).subscribe({
        next: (reviewsData) => {
          product.reviews = reviewsData;
        },
        error: (err) =>
          console.error(
            `Error loading reviews for product ${product.id}:`,
            err
          ),
      });
    });
  }

  get filteredProducts(): ProductWithReviews[] {
    const q = (this.searchQuery || '').toLowerCase();

    return this.products.filter((p) => {
      const matchesQuery =
        !q ||
        (p.name || '').toLowerCase().includes(q) ||
        (p.description || '').toLowerCase().includes(q);
      const matchesCategory =
        !this.selectedCategoryId || p.categoryId === this.selectedCategoryId;
      return matchesQuery && matchesCategory;
    });
  }

  applySorting(): void {
    switch (this.sortBy) {
      case 'price-low':
        this.products.sort((a, b) => a.price - b.price);
        break;
      case 'price-high':
        this.products.sort((a, b) => b.price - a.price);
        break;
      case 'rating':
        this.products.sort((a, b) => {
          const ratingA = a.reviews?.stats.averageRating
            ? parseFloat(a.reviews.stats.averageRating)
            : 0;
          const ratingB = b.reviews?.stats.averageRating
            ? parseFloat(b.reviews.stats.averageRating)
            : 0;
          return ratingB - ratingA;
        });
        break;
      default:
        this.products.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    }
  }

  addToCart(product: Product): void {
    this.cartService.addItem(product, 1);
  }

  viewProduct(product: Product): void {
    console.log('View product:', product);
  }

  toggleReviews(product: ProductWithReviews): void {
    product.showReviews = !product.showReviews;
  }

  getProductImage(photo?: string): string {
    if (!photo) return '';
    if (photo.startsWith('data:image')) return photo;

    const baseUrl = environment.apiUrl;
    return photo.startsWith('/') ? `${baseUrl}${photo}` : `${baseUrl}/${photo}`;
  }

  getStarArray(rating: number): boolean[] {
    return this.reviewService.getStarArray(rating);
  }

  getAverageRatingNumber(rating: string | undefined | null): number {
    if (rating === undefined || rating === null) return 0;
    const parsed = Number.parseFloat(rating);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  formatRating(rating: string): string {
    return this.reviewService.formatRating(parseFloat(rating));
  }

  onSortChange(): void {
    this.applySorting();
  }
}

