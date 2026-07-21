import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { ActivatedRoute } from '@angular/router';

import { environment } from '../../../environments/environment';
import { Category, CategoryService } from '../../services/category';
import { CartService } from '../../services/cart';
import { Product, ProductService } from '../../services/product';
import { CustomerAuthService } from '../../services/customer-auth';
import { RefreshService } from '../../services/refresh.service';
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
export class ShopComponent implements OnInit, OnDestroy {
  products: ProductWithReviews[] = [];
  categories: Category[] = [];
  featuredProducts: ProductWithReviews[] = [];
  
  searchQuery = '';
  selectedCategoryId = '';
  sortBy: 'name' | 'price-low' | 'price-high' | 'rating' = 'name';

  loading = true;
  private refreshSub?: Subscription;

  get isCustomerLoggedIn(): boolean {
    return this.customerAuth.isAuthenticated();
  }

  sections = [
    { 
      image: '/installation pano maison.png', 
      title: 'Installation Pano Maison', 
      desc: 'Solutions d\'énergie solaire pour votre maison'
    },
    { 
      image: '/installation pano.png', 
      title: 'Installation Pano', 
      desc: 'Panneaux solaires haute performance'
    },
    { 
      image: '/vente installation electroménagrs.png', 
      title: 'Vente Installation Électroménagers', 
      desc: 'Électroménagers de qualité premium'
    }
  ];

  services = [
    {
      icon: '☀️',
      title: 'Installation de Panneaux Solaires',
      desc: 'Installation professionnelle de panneaux solaires pour maison, commerce et industrie. Étude, fourniture, pose et mise en service.',
      link: 'https://wa.me/22879803856?text=' + encodeURIComponent("Bonjour, je souhaite obtenir un devis pour des panneaux solaires."),
      linkText: 'Demander un devis'
    },
    {
      icon: '🔧',
      title: 'Réparation Téléphones & Électronique',
      desc: 'Service de réparation expert pour smartphones, tablettes et appareils électroniques. Diagnostic gratuit, pièces de qualité.',
      link: 'https://wa.me/22879803856?text=' + encodeURIComponent("Bonjour, j'ai besoin d'une réparation pour mon appareil."),
      linkText: 'Réparer maintenant'
    }
  ];

  whatsappNumber = '+22879803856';

  constructor(
    private route: ActivatedRoute,
    private productService: ProductService,
    private categoryService: CategoryService,
    private cartService: CartService,
    private reviewService: ProductReviewService,
    private customerAuth: CustomerAuthService,
    private router: Router,
    private refreshService: RefreshService
  ) {}

  ngOnInit(): void {
    this.route.data.subscribe(({ data }) => {
      if (data && (data.products || data.categories)) {
        this.products = (data.products || [])
          .filter((p: any) => p.status === 'available')
          .map((p: any) => ({ ...p, showReviews: false }));
        this.featuredProducts = this.products
          .filter((p: any) => p.stockQuantity > 5)
          .slice(0, 6);
        this.categories = data.categories || [];
        this.applySorting();
        this.loadProductReviews();
        this.loading = false;
      } else {
        this.loadProducts();
        this.loadCategories();
      }
    }, (err) => {
      console.error('Shop resolver error:', err);
      this.loadProducts();
      this.loadCategories();
    });
    setTimeout(() => {
      if (this.loading) {
        console.warn('Shop loading fallback: forcing loading=false');
        this.loading = false;
      }
    }, 4000);
    this.refreshSub = this.refreshService.refresh$.subscribe(() => {
      this.loadProducts();
      this.loadCategories();
    });
  }

  ngOnDestroy(): void {
    this.refreshSub?.unsubscribe();
  }

  goToShop(): void {
    this.router.navigate(['/shop']);
  }

  goToCart(): void {
    this.router.navigate(['/cart']);
  }

  goToCheckout(): void {
    this.router.navigate(['/checkout']);
  }

  logoutCustomer(): void {
    this.customerAuth.logout();
    this.router.navigate(['/login']);
  }

  getWhatsAppLink(product: Product): string {
    const message = `Bonjour, je suis intéressé par le produit ${product.name}. Pouvez-vous m'envoyer plus d'informations ?`;
    return `https://wa.me/${this.whatsappNumber.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
  }

  loadProducts(): void {
    this.loading = true;
    this.productService.getProducts().subscribe({
      next: (data) => {
        this.products = data
          .filter((p) => p.status === 'available')
          .map((p) => ({ ...p, showReviews: false }));

        // Extract featured products: those with stock > 5
        this.featuredProducts = this.products
          .filter(p => p.stockQuantity > 5)
          .slice(0, 6);

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

  toggleReviews(product: ProductWithReviews): void {
    product.showReviews = !product.showReviews;
  }

  getProductImage(photo?: string): string {
    if (!photo) return '';
    if (photo.startsWith('data:image')) return photo;
    if (photo.includes('cloudinary.com')) return photo;
    if (photo.startsWith('http://') || photo.startsWith('https://')) return photo;
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

