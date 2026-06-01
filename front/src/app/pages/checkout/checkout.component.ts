import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CartService, CartItem } from '../../services/cart';
import { PaymentService, PaymentMethod } from '../../services/payment';
import { OrderService } from '../../services/order';
import { CustomerAuthService } from '../../services/customer-auth';

const PAYMENT_LABELS: Record<PaymentMethod, { name: string; icon: string; operator: string; color: string }> = {
  cash: { name: 'Espèces', icon: '💵', operator: '', color: '#22c55e' },
  orange_money: { name: 'Orange Money', icon: '🟠', operator: 'Orange Mali', color: '#ff7900' },
  moov_money: { name: 'Mobile Cash', icon: '🔵', operator: 'Moov Africa', color: '#0055a5' },
  wave: { name: 'Wave', icon: '🟢', operator: 'Wave', color: '#00d4aa' },
  bank_transfer: { name: 'Virement Bancaire', icon: '🏦', operator: '', color: '#6366f1' },
  card: { name: 'Carte Bancaire', icon: '💳', operator: '', color: '#8b5cf6' }
};

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './checkout.component.html',
  styleUrls: ['./checkout.component.css']
})
export class CheckoutComponent implements OnInit, OnDestroy {
  cartItems: CartItem[] = [];
  cartTotal = 0;

  customerName = '';
  customerEmail = '';
  customerPhone = '';
  shippingAddress = '';
  city = '';
  zipCode = '';

  paymentMethod: PaymentMethod = 'orange_money';
  payerPhone = '';
  mobileMoneyMethods: PaymentMethod[] = ['orange_money', 'moov_money', 'wave'];
  paymentLabels = PAYMENT_LABELS;

  subtotal = 0;
  tax = 0;
  shipping = 5000;
  total = 0;

  processing = false;
  errorMessage = '';
  successMessage = '';

  whatsappNumber = '+22879803856';
  createdOrderId = '';
  createdOrderRef = '';
  paymentStatus = '';
  private statusInterval: any;

  constructor(
    private cartService: CartService,
    private paymentService: PaymentService,
    private orderService: OrderService,
    private customerAuth: CustomerAuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.cartService.cartItems$.subscribe(items => {
      this.cartItems = items;
      this.calculateTotals();
    });
    this.cartService.cartTotal$.subscribe(total => {
      this.cartTotal = total;
      this.calculateTotals();
    });
  }

  ngOnDestroy(): void {
    if (this.statusInterval) clearInterval(this.statusInterval);
  }

  get isMobileMoney(): boolean {
    return this.mobileMoneyMethods.includes(this.paymentMethod);
  }

  calculateTotals(): void {
    this.subtotal = this.cartTotal;
    this.tax = Math.round(this.subtotal * 0.18);
    this.total = this.subtotal + this.tax + this.shipping;
  }

  validateForm(): string | null {
    if (!this.customerName.trim()) return 'Le nom est requis';
    if (!this.customerEmail.trim()) return 'L\'email est requis';
    if (!this.customerPhone.trim()) return 'Le téléphone est requis';
    if (!this.shippingAddress.trim()) return 'L\'adresse de livraison est requise';
    if (!this.city.trim()) return 'La ville est requise';
    if (!this.zipCode.trim()) return 'Le code postal est requis';
    if (this.isMobileMoney && !this.payerPhone.trim()) return 'Le numéro de paiement mobile est requis';
    return null;
  }

  getWhatsAppLink(amount: number, orderRef: string): string {
    const label = PAYMENT_LABELS[this.paymentMethod]?.name || this.paymentMethod;
    const message = `Bonjour, paiement ${label} de ${amount.toLocaleString()} FCFA pour la commande ${orderRef}. Nom: ${this.customerName}, Tel: ${this.customerPhone}.`;
    return `https://wa.me/${this.whatsappNumber.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
  }

  private startStatusPolling(depositId: string): void {
    this.statusInterval = setInterval(() => {
      this.paymentService.checkPaymentStatus(depositId).subscribe({
        next: (status) => {
          if (status.status === 'COMPLETED') {
            this.paymentStatus = 'completed';
            this.successMessage = '✅ Paiement confirmé ! Merci pour votre achat.';
            this.cartService.clearCart();
            this.processing = false;
            clearInterval(this.statusInterval);
          } else if (status.status === 'FAILED') {
            this.paymentStatus = 'failed';
            this.errorMessage = '❌ Le paiement a échoué. Réessayez ou utilisez WhatsApp.';
            this.processing = false;
            clearInterval(this.statusInterval);
          }
        }
      });
    }, 5000);
  }

  async processCheckout(): Promise<void> {
    this.errorMessage = '';
    this.successMessage = '';

    const error = this.validateForm();
    if (error) { this.errorMessage = error; return; }
    if (this.cartItems.length === 0) { this.errorMessage = 'Votre panier est vide'; return; }

    this.processing = true;
    const customerPayload = { name: this.customerName, email: this.customerEmail, phone: this.customerPhone };

    this.customerAuth.quickRegister(customerPayload).subscribe({
      next: (authResponse) => {
        const customerId = authResponse.customer?.id;
        if (!customerId) {
          this.errorMessage = 'Impossible d\'identifier le client.';
          this.processing = false;
          return;
        }

        const orderPayload: any = {
          customerId,
          customer: { name: this.customerName, email: this.customerEmail, phone: this.customerPhone, address: this.shippingAddress, city: this.city },
          items: this.cartItems.map(item => ({ productId: item.product.id!, quantity: item.quantity, unitPrice: item.product.price })),
          paymentMethod: this.paymentMethod,
          discount: 0, tax: this.tax, subtotal: this.subtotal,
          totalAmount: this.total,
          paidAmount: this.paymentMethod === 'cash' ? this.total : 0,
          deliveryAddress: this.shippingAddress
        };

        this.orderService.createOrder(orderPayload).subscribe({
          next: (createdOrder) => {
            this.createdOrderId = createdOrder.id!;
            this.createdOrderRef = createdOrder.orderNumber || createdOrder.id!;

            if (this.isMobileMoney) {
              this.paymentService.initiatePayment({
                orderId: createdOrder.id,
                amount: this.total,
                paymentMethod: this.paymentMethod,
                phoneNumber: this.payerPhone,
                customerId
              }).subscribe({
                next: (initResult) => {
                  if (initResult.success) {
                    this.successMessage = `✅ Paiement ${PAYMENT_LABELS[this.paymentMethod].name} initié ! Confirmez sur votre téléphone.`;
                    this.startStatusPolling(initResult.depositId);
                  } else {
                    this.errorMessage = initResult.message || 'Le paiement mobile n’a pas pu être initié. Réessayez.';
                    this.processing = false;
                  }
                },
                error: (error) => {
                  this.errorMessage = error?.error?.message || 'Impossible d’initier le paiement. Vérifiez votre connexion et réessayez.';
                  this.processing = false;
                }
              });
              return;
            }

            if (this.paymentMethod === 'cash') {
              this.paymentService.processPayment({
                orderId: createdOrder.id!, amount: this.total, paymentMethod: 'cash', status: 'completed'
              } as any).subscribe({
                next: () => this.completePayment(createdOrder.id!, this.total),
                error: () => { this.errorMessage = 'Erreur lors du paiement.'; this.processing = false; }
              });
              return;
            }

            this.successMessage = '✅ Commande enregistrée.';
            this.cartService.clearCart();
            this.processing = false;
            setTimeout(() => this.router.navigate(['/orders']), 2000);
          },
          error: () => { this.errorMessage = 'Erreur lors de la création de la commande.'; this.processing = false; }
        });
      },
      error: () => { this.errorMessage = 'Erreur lors de l\'enregistrement du client.'; this.processing = false; }
    });
  }

  private completePayment(orderId: string, amount: number): void {
    this.orderService.updateOrder(orderId, { status: 'paid', paidAmount: amount } as any).subscribe({
      next: () => {
        this.successMessage = '✅ Commande confirmée ! Merci pour votre achat.';
        this.cartService.clearCart();
        this.processing = false;
        setTimeout(() => this.router.navigate(['/orders']), 2000);
      },
      error: () => { this.errorMessage = 'Erreur lors de la confirmation.'; this.processing = false; }
    });
  }

  goBack(): void {
    this.router.navigate(['/cart']);
  }
}
