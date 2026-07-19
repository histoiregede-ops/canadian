import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { MessagingService, Conversation, Message } from '../../services/messaging';
import { CustomerAuthService, Customer } from '../../services/customer-auth';

@Component({
  selector: 'app-client-messages',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './client-messages.component.html',
  styleUrls: ['./client-messages.component.css']
})
export class ClientMessagesComponent implements OnInit, OnDestroy {
  conversations: Conversation[] = [];
  selectedConversation: Conversation | null = null;
  messages: Message[] = [];

  newMessage = '';

  sidebarOpen = false;
  loading = true;
  sendingMessage = false;
  typingUsers = new Map<string, string>();

  @ViewChild('messagesContainer') messagesContainer!: ElementRef;

  customer: Customer | null = null;
  productId?: string;
  productName?: string;
  productPrice?: number;
  productImage?: string;
  productMessagePlaceholder = '';
  notificationMessage = '';
  showNotificationBanner = false;
  authMode: 'login' | 'register' = 'login';
  authEmail = '';
  authPassword = '';
  authName = '';
  authPhone = '';
  authError = '';
  authLoading = false;

  private subscriptions = new Subscription();

  constructor(
    private messagingService: MessagingService,
    private customerAuth: CustomerAuthService,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.route.queryParamMap.subscribe((params) => {
      this.productId = params.get('productId') || undefined;
      this.productName = params.get('productName') || undefined;
      this.productImage = params.get('productImage') || undefined;
      this.productPrice = params.get('productPrice') ? parseFloat(params.get('productPrice') as string) : undefined;

      if (this.productName) {
        this.productMessagePlaceholder = `Je souhaite discuter du produit ${this.productName} (actuellement ${this.productPrice ? this.productPrice.toLocaleString() + ' FCFA' : 'prix non défini'}).`;
      }
    });

    this.customer = this.customerAuth.getCurrentCustomer();
    if (this.customer) {
      this.loadConversations();
      this.setupRealTime();
    } else {
      this.loading = false;
    }
  }

  private displayNotification(notification: { title: string; body: string; type: string}): void {
    this.notificationMessage = `${notification.title} — ${notification.body}`;
    this.showNotificationBanner = true;
    setTimeout(() => {
      this.showNotificationBanner = false;
    }, 6000);
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  get isAuthenticated(): boolean {
    return this.customer !== null;
  }

  switchAuthMode(mode: 'login' | 'register'): void {
    this.authMode = mode;
    this.authError = '';
  }

  onLogin(): void {
    if (!this.authEmail.trim() || !this.authPassword.trim()) {
      this.authError = 'Veuillez remplir tous les champs';
      return;
    }
    this.authLoading = true;
    this.authError = '';

    this.customerAuth.login(this.authEmail, this.authPassword).subscribe({
      next: (response) => {
        if (response.success && response.customer) {
          this.customer = response.customer;
          this.authLoading = false;
          this.loadConversations();
          this.setupRealTime();
        } else {
          this.authError = response.message || 'Erreur de connexion';
          this.authLoading = false;
        }
      },
      error: (err) => {
        this.authError = err.error?.error || err.error?.message || 'Email ou mot de passe incorrect';
        this.authLoading = false;
      }
    });
  }

  onRegister(): void {
    if (!this.authName.trim() || !this.authEmail.trim() || !this.authPassword.trim()) {
      this.authError = 'Veuillez remplir tous les champs obligatoires';
      return;
    }
    this.authLoading = true;
    this.authError = '';

    this.customerAuth.register({
      fullName: this.authName,
      name: this.authName,
      email: this.authEmail,
      phone: this.authPhone,
      password: this.authPassword
    } as any).subscribe({
      next: (response) => {
        if (response.success && response.customer) {
          this.customer = response.customer;
          this.authLoading = false;
          this.loadConversations();
          this.setupRealTime();
        } else {
          this.authError = response.message || 'Erreur lors de l\'inscription';
          this.authLoading = false;
        }
      },
      error: (err) => {
        this.authError = err.error?.error || err.error?.message || 'Erreur lors de l\'inscription';
        this.authLoading = false;
      }
    });
  }

  onLogout(): void {
    this.customerAuth.logout();
    this.customer = null;
    this.conversations = [];
    this.selectedConversation = null;
    this.messages = [];
    this.authEmail = '';
    this.authPassword = '';
    this.authName = '';
    this.authPhone = '';
    this.authError = '';
  }

  loadConversations(): void {
    const customerId = this.customer?.id || '';
    if (!customerId) return;

    this.messagingService.getConversations(customerId).subscribe({
      next: (data) => {
        this.conversations = data;
        this.loading = false;
        if (data.length > 0 && !this.selectedConversation) {
          this.selectConversation(data[0]);
        }
      },
      error: (err) => {
        console.error('Error loading conversations:', err);
        this.loading = false;
      }
    });
  }

  selectConversation(conversation: Conversation): void {
    if (this.selectedConversation) {
      this.messagingService.leaveConversation(this.selectedConversation.id!);
    }
    this.selectedConversation = conversation;
    this.typingUsers.clear();
    this.messagingService.joinConversation(conversation.id!);
    this.loadMessages(conversation.id!);
  }

  loadMessages(conversationId: string): void {
    this.messagingService.getMessages(conversationId).subscribe({
      next: (data) => {
        this.messages = data;
        this.scrollToBottom();
      },
      error: (err) => console.error('Error loading messages:', err)
    });
  }

  sendMessage(): void {
    if (!this.newMessage.trim() || !this.customer) return;

    this.sendingMessage = true;

    // Si pas de conversation, en créer une automatiquement
    if (!this.selectedConversation) {
      this.autoCreateAndSendMessage();
      return;
    }

    const senderName = this.customer.name || this.customer.email || 'Client';
    const message: Omit<Message, 'id' | 'createdAt'> = {
      conversationId: this.selectedConversation.id!,
      senderId: this.customer.id || localStorage.getItem('customerId') || 'unknown',
      senderName,
      senderRole: 'customer',
      content: this.newMessage
    };

    this.messagingService.sendMessage(message).subscribe({
      next: (sentMessage) => {
        if (sentMessage) {
          this.messages.push(sentMessage);
          this.scrollToBottom();
        }
      },
      error: (err) => {
        console.error('Error sending message:', err);
        this.notificationMessage = 'Erreur lors de l\'envoi du message. Veuillez réessayer.';
        this.showNotificationBanner = true;
        setTimeout(() => { this.showNotificationBanner = false; }, 6000);
      },
      complete: () => {
        this.newMessage = '';
        this.sendingMessage = false;
      }
    });
  }

  autoCreateAndSendMessage(): void {
    if (!this.customer) return;

    // Créer une conversation avec le sujet du premier message (premiers 50 chars)
    const subject = this.newMessage.length > 50 ? this.newMessage.substring(0, 50) + '...' : this.newMessage;

    const customerName = this.customer.name || this.customer.email || 'Client';
    const conversation: Omit<Conversation, 'id' | 'messages' | 'createdAt' | 'updatedAt'> = {
      customerId: this.customer.id!,
      customerName,
      customerPhone: this.customer.phone,
      customerEmail: this.customer.email,
      subject: subject || 'Nouvelle conversation',
      productId: this.productId,
      productName: this.productName,
      productPrice: this.productPrice,
      status: 'open',
      unreadCount: 0
    };

    this.messagingService.createConversation(conversation).subscribe({
      next: (newConversation) => {
        this.conversations.unshift(newConversation);
        this.selectedConversation = newConversation;
        this.messages = [];
        this.messagingService.joinConversation(newConversation.id!);
        
        // Maintenant envoyer le message
        const message: Omit<Message, 'id' | 'createdAt'> = {
          conversationId: newConversation.id!,
          senderId: this.customer!.id || localStorage.getItem('customerId') || 'unknown',
          senderName: this.customer!.name,
          senderRole: 'customer',
          content: this.newMessage
        };

        this.messagingService.sendMessage(message).subscribe({
          next: (sentMessage) => {
            if (sentMessage) {
              this.messages.push(sentMessage);
              this.scrollToBottom();
            }
          },
          error: (err) => {
            console.error('Error sending message:', err);
            this.notificationMessage = 'Erreur lors de l\'envoi du message. Veuillez réessayer.';
            this.showNotificationBanner = true;
            setTimeout(() => { this.showNotificationBanner = false; }, 6000);
          },
          complete: () => {
            this.newMessage = '';
            this.sendingMessage = false;
          }
        });
      },
      error: (err) => {
        console.error('Error creating conversation:', err);
        this.sendingMessage = false;
        this.notificationMessage = 'Erreur lors de la création de la conversation. Veuillez réessayer.';
        this.showNotificationBanner = true;
        setTimeout(() => { this.showNotificationBanner = false; }, 6000);
      }
    });
  }

  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  closeConversation(): void {
    if (!this.selectedConversation || !confirm('Fermer cette conversation?')) return;

    this.messagingService.closeConversation(this.selectedConversation.id!).subscribe({
      next: (updated) => {
        this.selectedConversation!.status = 'closed';
      },
      error: (err) => {
        console.error('Error closing conversation:', err);
        this.notificationMessage = 'Erreur lors de la fermeture de la conversation.';
        this.showNotificationBanner = true;
        setTimeout(() => { this.showNotificationBanner = false; }, 6000);
      }
    });
  }

  private setupRealTime(): void {
    this.subscriptions.add(
      this.messagingService.newMessage$.subscribe(msg => {
        if (msg && this.selectedConversation && msg.conversationId === this.selectedConversation.id) {
          const exists = this.messages.some(m => m.id === msg.id);
          if (!exists) {
            this.messages.push(msg);
            this.scrollToBottom();
          }
        }
      })
    );

    this.subscriptions.add(
      this.messagingService.typing$.subscribe(data => {
        if (data && this.selectedConversation && data.conversationId === this.selectedConversation.id) {
          if (data.isTyping) {
            this.typingUsers.set(data.userId, 'tape...');
          } else {
            this.typingUsers.delete(data.userId);
          }
        }
      })
    );

    this.subscriptions.add(
      this.messagingService.notification$.subscribe(notification => {
        if (notification) {
          this.displayNotification(notification);
        }
      })
    );

    this.subscriptions.add(
      this.messagingService.newMessage$.subscribe(() => {
        this.loadConversations();
      })
    );
  }

  private scrollToBottom(): void {
    setTimeout(() => {
      const container = this.messagesContainer?.nativeElement;
      if (container) container.scrollTop = container.scrollHeight;
    }, 100);
  }
}
