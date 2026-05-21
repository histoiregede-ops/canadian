import { Component, OnInit, HostListener, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProductService, Product } from '../../services/product';
import { OrderService, OrderData } from '../../services/order';
import { PdfService } from '../../services/pdf';
import { PaymentService, PaymentMethod } from '../../services/payment';
import { ConfigService, PaymentMethod as ConfigPaymentMethod } from '../../services/config';
import { RefreshService } from '../../services/refresh.service';
import { environment } from '../../../environments/environment';

interface CartItem {
  product: Product;
  quantity: number;
}

@Component({
  selector: 'app-sales',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './sales.component.html',
  styleUrls: ['./sales.component.css']
})
export class SalesComponent implements OnInit, OnDestroy {
  products: Product[] = [];
  cart: CartItem[] = [];
  searchQuery: string = '';
  paymentMethod: string = 'cash';
  discount: number = 0;
  tax: number = 0;
  isCartCollapsed: boolean = false;
  whatsappNumber = '';
  lastOrderRef = '';
  payerPhone = '';
  paymentMethodsList: ConfigPaymentMethod[] = [];
  paymentLabels: Record<string, { name: string; icon: string; operator: string }> = {};
  mobileMoneyMethods: string[] = [];

  paymentStatus = '';
  paymentProcessing = false;
  paymentErrorMessage = '';
  private statusInterval: any;

  constructor(
    private productService: ProductService,
    private orderService: OrderService,
    private pdfService: PdfService,
    private paymentService: PaymentService,
    private configService: ConfigService,
    private refreshService: RefreshService
  ) { }

  ngOnInit(): void {
    if (window.innerWidth <= 1200) {
      this.isCartCollapsed = true;
    }
    this.loadConfig();
    this.loadProducts();
  }

  ngOnDestroy(): void {
    if (this.statusInterval) clearInterval(this.statusInterval);
  }

  @HostListener('window:resize')
  onResize(): void {
    if (window.innerWidth <= 1200) {
      this.isCartCollapsed = true;
    } else {
      this.isCartCollapsed = false;
    }
  }

  private loadConfig() {
    this.configService.getPaymentMethods().subscribe(config => {
      this.paymentMethodsList = config.methods;
      this.whatsappNumber = config.whatsapp;
      this.mobileMoneyMethods = config.methods.filter(m => m.isMobileMoney).map(m => m.key);
      config.methods.forEach(m => {
        this.paymentLabels[m.key] = { name: m.name, icon: '', operator: m.operator };
      });
      if (this.paymentMethodsList.length > 0) {
        this.paymentMethod = this.paymentMethodsList[0].key;
      }
    });
  }

  loadProducts(): void {
    this.productService.getProducts().subscribe(data => {
      this.products = data;
    });
  }

  getProductImage(photo: string): string {
    if (!photo) return '';
    if (photo.startsWith('data:image')) return photo;
    if (photo.includes('cloudinary.com')) return photo;
    const baseUrl = environment.apiUrl;
    return photo.startsWith('/') ? `${baseUrl}${photo}` : `${baseUrl}/${photo}`;
  }

  get filteredProducts() {
    return this.products.filter(p =>
      p.name.toLowerCase().includes(this.searchQuery.toLowerCase())
    );
  }

  addToCart(product: Product): void {
    if (product.stockQuantity <= 0) {
      alert('Stock insuffisant !');
      return;
    }
    const existing = this.cart.find(item => item.product.id === product.id);
    if (existing) {
      existing.quantity++;
    } else {
      this.cart.push({ product, quantity: 1 });
    }
  }

  removeFromCart(index: number): void {
    this.cart.splice(index, 1);
  }

  updateQuantity(index: number, delta: number): void {
    const item = this.cart[index];
    item.quantity += delta;
    if (item.quantity <= 0) {
      this.removeFromCart(index);
    }
  }

  get subtotal(): number {
    return this.cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
  }

  get total(): number {
    const disc = Number(this.discount) || 0;
    const tx = Number(this.tax) || 0;
    return this.subtotal - disc + tx;
  }

  get isMobileMoney(): boolean {
    return this.mobileMoneyMethods.includes(this.paymentMethod);
  }

  clearCart(): void {
    this.cart = [];
  }

  toggleCart(): void {
    this.isCartCollapsed = !this.isCartCollapsed;
  }

  getWhatsAppLink(amount: number, orderRef: string): string {
    const label = this.paymentLabels[this.paymentMethod]?.name || this.paymentMethod;
    const message = `Bonjour, paiement ${label} de ${amount.toLocaleString()} FCFA pour la commande ${orderRef}.`;
    return `https://wa.me/${this.whatsappNumber.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
  }

  checkout(): void {
    if (this.cart.length === 0) return;

    if (this.isMobileMoney && !this.payerPhone.trim()) {
      alert('Veuillez entrer le numéro de téléphone du client.');
      return;
    }

    this.paymentProcessing = true;
    this.paymentStatus = '';
    this.paymentErrorMessage = '';

    const orderData: OrderData = {
      items: this.cart.map(item => ({
        productId: item.product.id!,
        quantity: item.quantity,
        unitPrice: item.product.price
      })),
      paymentMethod: this.paymentMethod,
      discount: Number(this.discount) || 0,
      tax: Number(this.tax) || 0,
      subtotal: this.subtotal,
      totalAmount: this.total,
      paidAmount: this.paymentMethod === 'cash' ? this.total : 0
    };

    this.orderService.createOrder(orderData).subscribe({
      next: (res) => {
        this.lastOrderRef = res.orderNumber || res.id;

        if (this.isMobileMoney) {
          this.paymentService.initiatePayment({
            orderId: res.id,
            amount: this.total,
            paymentMethod: this.paymentMethod,
            phoneNumber: this.payerPhone
          }).subscribe({
            next: (initResult) => {
              if (initResult.success) {
                this.paymentStatus = 'initiated';
                this.startPaymentStatusPolling(initResult.depositId, res.id);
              } else {
                this.paymentStatus = 'failed';
                this.paymentErrorMessage = `Paiement échoué: ${initResult.message}`;
                this.paymentProcessing = false;
              }
            },
            error: (err) => {
              console.error('Payment initiation error:', err);
              this.paymentStatus = 'failed';
              this.paymentErrorMessage = 'Erreur lors de l\'initiation du paiement. Utilisez WhatsApp.';
              this.paymentProcessing = false;
            }
          });
          return;
        }

        if (this.paymentMethod === 'cash') {
          this.paymentService.processPayment({
            orderId: res.id!, amount: this.total, paymentMethod: 'cash', status: 'completed'
          } as any).subscribe({
            next: () => {
              this.paymentStatus = 'completed';
              this.afterCheckout(orderData, res);
            },
            error: () => { this.paymentErrorMessage = 'Erreur lors du paiement.'; this.paymentProcessing = false; }
          });
          return;
        }

        this.paymentStatus = 'completed';
        this.afterCheckout(orderData, res);
      },
      error: (err) => {
        console.error('Checkout error:', err);
        this.paymentErrorMessage = 'Erreur lors de la vente.';
        this.paymentProcessing = false;
      }
    });
  }

  private startPaymentStatusPolling(depositId: string, orderId: string): void {
    this.statusInterval = setInterval(() => {
      this.paymentService.checkPaymentStatus(depositId).subscribe({
        next: (status) => {
          if (status.status === 'COMPLETED') {
            this.paymentStatus = 'completed';
            this.paymentProcessing = false;
            clearInterval(this.statusInterval);
            this.paymentService.processPayment({
              orderId, amount: this.total, paymentMethod: this.paymentMethod as PaymentMethod, status: 'completed'
            } as any).subscribe({
              next: () => {
                const orderData: OrderData = {
                  items: this.cart.map(item => ({ productId: item.product.id!, quantity: item.quantity, unitPrice: item.product.price })),
            paymentMethod: this.paymentMethod as PaymentMethod,
                  discount: Number(this.discount) || 0,
                  tax: Number(this.tax) || 0,
                  subtotal: this.subtotal,
                  totalAmount: this.total,
                  paidAmount: this.total
                };
                this.afterCheckout(orderData, { id: orderId, orderNumber: this.lastOrderRef });
              }
            });
          } else if (status.status === 'FAILED') {
            this.paymentStatus = 'failed';
            this.paymentErrorMessage = 'Le paiement a échoué. Réessayez ou utilisez WhatsApp.';
            this.paymentProcessing = false;
            clearInterval(this.statusInterval);
          }
        },
        error: () => {
          console.error('Status check error');
        }
      });
    }, 5000);
  }

  private afterCheckout(orderData: OrderData, res: any): void {
    this.refreshService.triggerRefresh();

    if (this.isMobileMoney) {
      const label = this.paymentLabels[this.paymentMethod]?.name || this.paymentMethod;
      if (confirm(`💬 Envoyer la confirmation ${label} par WhatsApp ?`)) {
        window.open(this.getWhatsAppLink(this.total, this.lastOrderRef), '_blank');
      }
    }

    this.pdfService.generateReceipt({
      ...orderData,
      orderNumber: res.orderNumber,
      items: this.cart.map(item => ({
        productName: item.product.name,
        quantity: item.quantity,
        unitPrice: item.product.price
      }))
    });

    this.clearCart();
    this.loadProducts();
  }
}
