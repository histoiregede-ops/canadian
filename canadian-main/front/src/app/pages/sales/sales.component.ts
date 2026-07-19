import { Component, OnInit, HostListener, OnDestroy, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { timeout } from 'rxjs/operators';
import { ProductService, Product } from '../../services/product';
import { OrderService, OrderData } from '../../services/order';
import { PdfService } from '../../services/pdf';
import { PaymentService, PaymentMethod } from '../../services/payment';
import { ConfigService, PaymentMethod as ConfigPaymentMethod } from '../../services/config';
import { RefreshService } from '../../services/refresh.service';
import { CustomerService, Customer } from '../../services/customer';
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
  private readonly MAX_POLLING_ATTEMPTS = 60;
  private pollingAttempts = 0;

  selectedCustomer: Customer | null = null;
  customerSearchQuery = '';
  customerSearchResults: Customer[] = [];
  showCustomerDropdown = false;
  loyaltyDiscountRate = 0;
  private refreshSub: Subscription | null = null;

  lastCompletedOrder: { orderNumber?: string; id?: string; orderData?: OrderData; cartItems?: { productName: string; quantity: number; unitPrice: number }[] } | null = null;

  constructor(
    private route: ActivatedRoute,
    private productService: ProductService,
    private orderService: OrderService,
    private pdfService: PdfService,
    private paymentService: PaymentService,
    private configService: ConfigService,
    private refreshService: RefreshService,
    private customerService: CustomerService,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone
  ) { }

  ngOnInit(): void {
    if (window.innerWidth <= 1200) {
      this.isCartCollapsed = true;
    }
    this.route.data.subscribe(({ data }) => {
      if (data) {
        this.products = data.products;
        this.paymentMethodsList = data.config.methods;
        this.whatsappNumber = data.config.whatsapp;
        this.mobileMoneyMethods = data.config.methods.filter((m: any) => m.isMobileMoney).map((m: any) => m.key);
        data.config.methods.forEach((m: any) => {
          this.paymentLabels[m.key] = { name: m.name, icon: '', operator: m.operator };
        });
        if (this.paymentMethodsList.length > 0) {
          this.paymentMethod = this.paymentMethodsList[0].key;
        }
      }
    });
    this.refreshSub = this.refreshService.refresh$.subscribe(() => {
      this.loadProducts();
      this.loadConfig();
    });
    this.loadScanCart();
  }

  private loadScanCart(): void {
    const scanCart = localStorage.getItem('scanCart');
    if (scanCart) {
      localStorage.removeItem('scanCart');
      try {
        const items = JSON.parse(scanCart);
        this.productService.getProducts().subscribe(products => {
          for (const item of items) {
            const product = products.find(p => p.id === item.productId);
            if (product) {
              const existing = this.cart.find(c => c.product.id === product.id);
              if (existing) {
                existing.quantity += item.quantity;
              } else {
                this.cart.push({ product, quantity: item.quantity });
              }
            }
          }
        });
      } catch (e) {
        console.error('Failed to parse scan cart', e);
      }
    }
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

  searchCustomers(): void {
    const q = this.customerSearchQuery.trim();
    if (q.length < 2) {
      this.customerSearchResults = [];
      this.showCustomerDropdown = false;
      return;
    }
    this.customerService.searchCustomers(q).subscribe({
      next: (results) => {
        this.customerSearchResults = results;
        this.showCustomerDropdown = results.length > 0;
      },
      error: () => {
        this.customerSearchResults = [];
        this.showCustomerDropdown = false;
      }
    });
  }

  selectCustomer(customer: Customer): void {
    this.selectedCustomer = customer;
    this.customerSearchQuery = customer.fullName || customer.name || '';
    this.showCustomerDropdown = false;
    this.customerSearchResults = [];
    this.loadCustomerLoyalty(customer);
  }

  onCustomerSearchBlur(): void {
    setTimeout(() => this.showCustomerDropdown = false, 200);
  }

  clearSelectedCustomer(): void {
    this.selectedCustomer = null;
    this.customerSearchQuery = '';
    this.loyaltyDiscountRate = 0;
    this.showCustomerDropdown = false;
  }

  private loadCustomerLoyalty(customer: Customer): void {
    if (!customer.id) return;
    this.customerService.getCustomerLoyalty(customer.id).subscribe({
      next: (loyalty) => {
        customer.loyaltyPoints = loyalty.points;
        customer.loyaltyLevel = loyalty.level;
        customer.totalSpent = loyalty.totalSpent;
        customer.orderCount = loyalty.orderCount;
        if (loyalty.level === 'platinum') {
          this.loyaltyDiscountRate = Math.round(this.subtotal * 0.1);
        } else if (loyalty.level === 'gold') {
          this.loyaltyDiscountRate = Math.round(this.subtotal * 0.05);
        } else {
          this.loyaltyDiscountRate = 0;
        }
      },
      error: () => {}
    });
  }

  getLoyaltyLevelClass(): string {
    return this.selectedCustomer?.loyaltyLevel || 'bronze';
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
    if (!item) return;
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
    const loyaltyDisc = this.loyaltyDiscountRate || 0;
    const tx = Number(this.tax) || 0;
    return this.subtotal - disc - loyaltyDisc + tx;
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

  private resetPaymentState(): void {
    this.paymentProcessing = false;
    this.paymentStatus = 'failed';
    try { this.cdr.detectChanges(); } catch (_) {}
  }

  getWhatsAppLink(amount: number, orderRef: string): string {
    const label = this.paymentLabels[this.paymentMethod]?.name || this.paymentMethod;
    const message = `Bonjour, paiement ${label} de ${amount.toLocaleString()} FCFA pour la commande ${orderRef}.`;
    return `https://wa.me/${this.whatsappNumber.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
  }

  checkout(): void {
    console.debug('[CHECKOUT] Début checkout, panier:', this.cart.length, 'articles');
    if (this.cart.length === 0) {
      console.warn('[CHECKOUT] Panier vide');
      return;
    }

    for (const item of this.cart) {
      if (item.quantity > (item.product.stockQuantity || 0)) {
        console.warn('[CHECKOUT] Stock insuffisant pour', item.product.name);
        alert(`Stock insuffisant pour ${item.product.name}: ${item.product.stockQuantity} disponible(s), ${item.quantity} demandé(s).`);
        return;
      }
    }

    if (this.isMobileMoney && !this.payerPhone.trim()) {
      console.warn('[CHECKOUT] Pas de numéro mobile money');
      alert('Veuillez entrer le numéro de téléphone du client.');
      return;
    }

    this.paymentProcessing = true;
    this.paymentStatus = '';
    this.paymentErrorMessage = '';
    this.cdr.detectChanges();

    const receiptCartItems = this.cart.map(item => ({
      productName: item.product.name,
      quantity: item.quantity,
      unitPrice: item.product.price
    }));
    const totalDiscount = (Number(this.discount) || 0) + (this.loyaltyDiscountRate || 0);
    const orderData: OrderData = {
      items: this.cart.map(item => ({
        productId: item.product.id!,
        quantity: item.quantity,
        unitPrice: item.product.price
      })),
      paymentMethod: this.paymentMethod,
      discount: totalDiscount,
      tax: Number(this.tax) || 0,
      subtotal: this.subtotal,
      totalAmount: this.total,
      paidAmount: this.paymentMethod === 'cash' ? this.total : 0
    };

    const orderJson = JSON.stringify(orderData);
    console.debug('[CHECKOUT] Envoi createOrder:', orderJson.substring(0, 500));

    this.orderService.createOrder(orderData).pipe(
      timeout(30000)
    ).subscribe({
      next: (res) => {
        console.debug('[CHECKOUT] createOrder succès:', JSON.stringify(res).substring(0, 300));

        if (!res || !res.id) {
          console.error('[CHECKOUT] Réponse createOrder sans id:', res);
          this.paymentErrorMessage = 'Erreur: réponse commande invalide.';
          this.resetPaymentState();
          return;
        }

        this.lastOrderRef = res.orderNumber || res.id;
        this.lastCompletedOrder = {
          orderNumber: res.orderNumber,
          id: res.id,
          orderData,
          cartItems: receiptCartItems
        };
        console.debug('[CHECKOUT] lastCompletedOrder stocké, id=', res.id, 'ref=', this.lastOrderRef);

        if (this.isMobileMoney) {
          console.debug('[CHECKOUT] Mode mobile money, initiation paiement...');
          this.paymentService.initiatePayment({
            orderId: res.id,
            amount: this.total,
            paymentMethod: this.paymentMethod as PaymentMethod,
            phoneNumber: this.payerPhone
          }).subscribe({
            next: (initResult) => {
              console.debug('[CHECKOUT] Initiation résultat:', JSON.stringify(initResult));
              if (initResult.success) {
                this.paymentStatus = 'initiated';
                try { this.cdr.detectChanges(); } catch (_) {}
                this.startPaymentStatusPolling(initResult.depositId, res.id);
              } else {
                console.error('[CHECKOUT] Initiation échouée:', initResult.message);
                this.paymentStatus = 'failed';
                this.paymentErrorMessage = `Paiement échoué: ${initResult.message}`;
                this.paymentProcessing = false;
                try { this.cdr.detectChanges(); } catch (_) {}
              }
            },
            error: (err) => {
              console.error('[CHECKOUT] Erreur initiation paiement:', err);
              this.paymentStatus = 'failed';
              this.paymentErrorMessage = 'Erreur lors de l\'initiation du paiement. Utilisez WhatsApp.';
              this.resetPaymentState();
            }
          });
          return;
        }

        if (this.paymentMethod === 'cash') {
          console.debug('[CHECKOUT] Mode cash, commande déjà traitée par le backend');
          this.paymentStatus = 'completed';
          this.paymentProcessing = false;
          this.cdr.detectChanges();
          setTimeout(() => {
            console.debug('[CHECKOUT] Appel afterCheckout après cash');
            this.afterCheckout(orderData, res);
          }, 0);
          return;
        }

        console.debug('[CHECKOUT] Autre méthode, finalisation');
        this.paymentStatus = 'completed';
        this.paymentProcessing = false;
        this.cdr.detectChanges();
        setTimeout(() => this.afterCheckout(orderData, res), 0);
      },
      error: (err) => {
        console.error('[CHECKOUT] ERREUR createOrder:', err);
        if (err.error && err.error.error) {
          console.error('[CHECKOUT] Message backend:', err.error.error);
          this.paymentErrorMessage = 'Erreur: ' + err.error.error;
        } else if (err.message) {
          console.error('[CHECKOUT] Message erreur:', err.message);
          this.paymentErrorMessage = 'Erreur: ' + err.message;
        } else {
          this.paymentErrorMessage = 'Erreur lors de la vente.';
        }
        this.resetPaymentState();
      }
    });
  }

  printReceipt(): void {
    if (!this.lastCompletedOrder || !this.lastCompletedOrder.orderData) {
      alert('Aucune vente récente à imprimer. Effectuez d\'abord une vente.');
      return;
    }
    const { orderNumber, id, orderData, cartItems } = this.lastCompletedOrder;
    this.pdfService.generateReceipt({
      ...orderData,
      orderNumber: orderNumber || id,
      items: cartItems || []
    }).catch(err => console.error('[RECEIPT] Erreur génération reçu:', err));
  }

  private startPaymentStatusPolling(depositId: string, orderId: string): void {
    console.debug('[POLLING] Début polling depositId=', depositId, 'orderId=', orderId);
    this.pollingAttempts = 0;
    this.statusInterval = setInterval(() => {
      this.pollingAttempts++;
      console.debug('[POLLING] Tentative', this.pollingAttempts, '/', this.MAX_POLLING_ATTEMPTS);
      if (this.pollingAttempts > this.MAX_POLLING_ATTEMPTS) {
        console.warn('[POLLING] Maximum tentatives atteint');
        clearInterval(this.statusInterval);
        this.paymentStatus = 'failed';
        this.paymentErrorMessage = 'Le délai d\'attente du paiement est dépassé. Utilisez WhatsApp.';
        this.resetPaymentState();
        return;
      }
      this.paymentService.checkPaymentStatus(depositId).subscribe({
        next: (status) => {
          console.debug('[POLLING] Statut reçu:', JSON.stringify(status));
          const s = (status.status || '').toUpperCase();
          if (s === 'COMPLETED') {
            console.debug('[POLLING] Paiement COMPLETED');
            this.paymentStatus = 'completed';
            this.paymentProcessing = false;
            try { this.cdr.detectChanges(); } catch (_) {}
            clearInterval(this.statusInterval);
            const totalDiscount = (Number(this.discount) || 0) + (this.loyaltyDiscountRate || 0);
            const orderData: OrderData = {
              items: this.cart.map(item => ({ productId: item.product.id!, quantity: item.quantity, unitPrice: item.product.price })),
              paymentMethod: this.paymentMethod as PaymentMethod,
              discount: totalDiscount,
              tax: Number(this.tax) || 0,
              subtotal: this.subtotal,
              totalAmount: this.total,
              paidAmount: this.total
            };
            this.paymentService.processPayment({
              orderId, amount: this.total, paymentMethod: this.paymentMethod as PaymentMethod, status: 'completed'
            } as any).pipe(
              timeout(15000)
            ).subscribe({
              next: () => {
                console.debug('[POLLING] processPayment OK, finalisation');
                this.afterCheckout(orderData, { id: orderId, orderNumber: this.lastOrderRef });
              },
              error: (err) => {
                console.error('[POLLING] processPayment échoué mais on continue:', err);
                this.afterCheckout(orderData, { id: orderId, orderNumber: this.lastOrderRef });
              }
            });
          } else if (s === 'FAILED') {
            console.warn('[POLLING] Paiement FAILED');
            this.paymentStatus = 'failed';
            this.paymentErrorMessage = 'Le paiement a échoué. Réessayez ou utilisez WhatsApp.';
            this.resetPaymentState();
            clearInterval(this.statusInterval);
          } else {
            console.debug('[POLLING] Statut en cours:', s);
          }
        },
        error: (err) => {
          console.error('[POLLING] Erreur checkPaymentStatus:', err);
          this.pollingAttempts++;
          if (this.pollingAttempts > this.MAX_POLLING_ATTEMPTS) {
            clearInterval(this.statusInterval);
            this.paymentStatus = 'failed';
            this.paymentErrorMessage = 'Le paiement a pris trop de temps. Utilisez WhatsApp.';
            this.resetPaymentState();
          }
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

    this.clearCart();
    this.loadProducts();
    try { this.cdr.detectChanges(); } catch (_) {}
  }
}
