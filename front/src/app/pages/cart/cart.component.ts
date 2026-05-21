import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CartService, CartItem } from '../../services/cart';
import { environment } from '../../../environments/environment';
import { Subscription } from 'rxjs';


@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './cart.component.html',
  styleUrls: ['./cart.component.css']
})
export class CartComponent implements OnInit, OnDestroy {
  cartItems: CartItem[] = [];
  cartTotal = 0;
  private subscriptions: Subscription = new Subscription();

  // Pricing
  taxRate = 0.18; // 18% VAT
  shippingCost = 5000; // 5000 FCFA
  
  constructor(
    private cartService: CartService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Subscribe to cart items
    this.subscriptions.add(
      this.cartService.cartItems$.subscribe(items => {
        this.cartItems = items;
      })
    );

    // Subscribe to cart total
    this.subscriptions.add(
      this.cartService.cartTotal$.subscribe(total => {
        this.cartTotal = total;
      })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  updateQuantity(item: CartItem, newQuantity: number): void {
    if (newQuantity > 0) {
      this.cartService.updateQuantity(item.product.id!, newQuantity);
    }
  }

  removeItem(productId: string): void {
    if (confirm('Êtes-vous sûr de vouloir supprimer cet article?')) {
      this.cartService.removeItem(productId);
    }
  }

  continueShopping(): void {
    this.router.navigate(['/shop']);
  }

  checkout(): void {
    if (this.cartItems.length === 0) {
      alert('Votre panier est vide!');
      return;
    }
    this.router.navigate(['/checkout']);
  }

  get subtotal(): number {
    return this.cartTotal;
  }

  get tax(): number {
    return Math.round(this.subtotal * this.taxRate);
  }

  get total(): number {
    return this.subtotal + this.tax + this.shippingCost;
  }

  getProductImage(photo: string): string {
    if (!photo) return '';
    if (photo.startsWith('data:image')) return photo;
    if (photo.includes('cloudinary.com')) return photo;
    const baseUrl = environment.apiUrl;
    return photo.startsWith('/') ? `${baseUrl}${photo}` : `${baseUrl}/${photo}`;
  }
}
