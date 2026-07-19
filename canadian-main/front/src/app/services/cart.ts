import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Product } from './product';

export interface CartItem {
  product: Product;
  quantity: number;
}

@Injectable({
  providedIn: 'root'
})
export class CartService {
  private cartItems = new BehaviorSubject<CartItem[]>([]);
  public cartItems$ = this.cartItems.asObservable();

  private cartTotal = new BehaviorSubject<number>(0);
  public cartTotal$ = this.cartTotal.asObservable();

  private cartCount = new BehaviorSubject<number>(0);
  public cartCount$ = this.cartCount.asObservable();

  constructor() {
    this.loadCart();
  }

  // Load cart from localStorage
  private loadCart(): void {
    const stored = localStorage.getItem('cart');
    if (stored) {
      try {
        this.cartItems.next(JSON.parse(stored));
        this.calculateTotal();
      } catch (e) {
        console.error('Error loading cart:', e);
      }
    }
  }

  // Save cart to localStorage
  private saveCart(): void {
    localStorage.setItem('cart', JSON.stringify(this.cartItems.value));
    this.calculateTotal();
  }

  // Add item to cart
  addItem(product: Product, quantity: number = 1): void {
    const items = this.cartItems.value;
    const existingItem = items.find(item => item.product.id === product.id);

    if (existingItem) {
      existingItem.quantity += quantity;
    } else {
      items.push({ product, quantity });
    }

    this.cartItems.next([...items]);
    this.saveCart();
  }

  // Remove item from cart
  removeItem(productId: string): void {
    const items = this.cartItems.value.filter(item => item.product.id !== productId);
    this.cartItems.next(items);
    this.saveCart();
  }

  // Update item quantity
  updateQuantity(productId: string, quantity: number): void {
    const items = this.cartItems.value;
    const item = items.find(i => i.product.id === productId);

    if (item) {
      if (quantity <= 0) {
        this.removeItem(productId);
      } else {
        item.quantity = quantity;
        this.cartItems.next([...items]);
        this.saveCart();
      }
    }
  }

  // Get cart total
  calculateTotal(): void {
    const total = this.cartItems.value.reduce((sum, item) => {
      return sum + (item.product.price * item.quantity);
    }, 0);
    this.cartTotal.next(total);
    this.cartCount.next(this.cartItems.value.reduce((sum, item) => sum + item.quantity, 0));
  }

  // Clear cart
  clearCart(): void {
    this.cartItems.next([]);
    this.cartTotal.next(0);
    this.cartCount.next(0);
    localStorage.removeItem('cart');
  }

  // Get current cart
  getCart(): CartItem[] {
    return this.cartItems.value;
  }

  // Get cart count
  getCartCount(): number {
    return this.cartCount.value;
  }

  // Get cart total
  getTotal(): number {
    return this.cartTotal.value;
  }
}
