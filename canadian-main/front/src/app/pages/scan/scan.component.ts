import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Product, ProductService } from '../../services/product';
import { environment } from '../../../environments/environment';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-scan',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './scan.component.html',
  styleUrls: ['./scan.component.css']
})
export class ScanComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('barcodeInput') barcodeInput!: ElementRef<HTMLInputElement>;

  apiUrl = environment.apiUrl;
  barcode = '';
  scannedProduct: Product | null = null;
  notFound = false;
  searching = false;
  cart: { product: Product; quantity: number }[] = [];
  showCart = false;
  resolvedProducts: Product[] = [];

  constructor(private route: ActivatedRoute, private productService: ProductService) {}

  ngOnInit(): void {
    this.route.data.subscribe(({ data }) => {
      if (data) {
        this.resolvedProducts = data.products;
      }
    });
  }

  ngAfterViewInit(): void {
    setTimeout(() => this.barcodeInput?.nativeElement?.focus(), 100);
  }

  ngOnDestroy(): void {}

  onBarcodeEnter(): void {
    const code = this.barcode.trim();
    if (!code) return;
    this.searching = true;
    this.notFound = false;
    this.scannedProduct = null;

    if (this.resolvedProducts.length > 0) {
      const found = this.resolvedProducts.find(p => p.barcode === code);
      if (found) {
        this.scannedProduct = found;
        this.notFound = false;
      } else {
        this.scannedProduct = null;
        this.notFound = true;
      }
      this.searching = false;
      setTimeout(() => {
        this.barcode = '';
        this.barcodeInput?.nativeElement?.focus();
      }, 100);
    } else {
      this.productService.getProducts().subscribe({
        next: (products) => {
          const found = products.find(p => p.barcode === code);
          if (found) {
            this.scannedProduct = found;
            this.notFound = false;
          } else {
            this.scannedProduct = null;
            this.notFound = true;
          }
          this.searching = false;
          setTimeout(() => {
            this.barcode = '';
            this.barcodeInput?.nativeElement?.focus();
          }, 100);
        },
        error: () => {
          this.searching = false;
          setTimeout(() => {
            this.barcode = '';
            this.barcodeInput?.nativeElement?.focus();
          }, 100);
        }
      });
    }
  }

  addToCart(): void {
    if (!this.scannedProduct) return;
    const existing = this.cart.find(c => c.product.id === this.scannedProduct!.id);
    if (existing) {
      if (existing.quantity < (this.scannedProduct.stockQuantity || 0)) {
        existing.quantity++;
      } else {
        alert('Stock insuffisant!');
        return;
      }
    } else {
      if ((this.scannedProduct.stockQuantity || 0) <= 0) {
        alert('Ce produit est en rupture de stock.');
        return;
      }
      this.cart.push({ product: this.scannedProduct, quantity: 1 });
    }
    this.scannedProduct = null;
    this.showCart = true;
  }

  removeFromCart(index: number): void {
    this.cart.splice(index, 1);
    if (this.cart.length === 0) this.showCart = false;
  }

  getTotal(): number {
    return this.cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  }

  checkout(): void {
    if (this.cart.length === 0) return;
    const items = this.cart.map(item => ({
      productId: item.product.id,
      productName: item.product.name,
      quantity: item.quantity,
      unitPrice: item.product.price
    }));
    localStorage.setItem('scanCart', JSON.stringify(items));
    window.location.href = '/sales';
  }

  clearCart(): void {
    this.cart = [];
    this.showCart = false;
  }

  getProductImage(product: any): string {
    if (product.photo) {
      if (product.photo.startsWith('http') || product.photo.startsWith('/')) {
        return product.photo;
      }
      return `${this.apiUrl}/public/products/${product.photo}`;
    }
    return 'https://via.placeholder.com/80';
  }
}
