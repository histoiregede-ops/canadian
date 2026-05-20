import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
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
  conversationSubject = '';
  showNewConversationForm = false;

  sidebarOpen = false;
  loading = true;
  sendingMessage = false;
  typingUsers = new Map<string, string>();

  @ViewChild('messagesContainer') messagesContainer!: ElementRef;

  customer: Customer | null = null;
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
    private customerAuth: CustomerAuthService
  ) {}

  ngOnInit(): void {
    this.customer = this.customerAuth.getCurrentCustomer();
    if (this.customer) {
      this.loadConversations();
      this.setupRealTime();
    } else {
      this.loading = false;
    }
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
    if (!this.newMessage.trim() || !this.selectedConversation || !this.customer) return;

    this.sendingMessage = true;

    const message: Omit<Message, 'id' | 'createdAt'> = {
      conversationId: this.selectedConversation.id!,
      senderId: this.customer.id!,
      senderName: this.customer.name,
      senderRole: 'customer',
      content: this.newMessage
    };

    this.messagingService.sendMessage(message).subscribe({
      next: (sentMessage) => {
        if (sentMessage) {
          this.messages.push(sentMessage);
          this.scrollToBottom();
        }
        this.newMessage = '';
        this.sendingMessage = false;
      },
      error: (err) => {
        console.error('Error sending message:', err);
        this.sendingMessage = false;
      }
    });
  }

  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  createNewConversation(): void {
    if (!this.conversationSubject.trim() || !this.customer) return;

    const conversation: Omit<Conversation, 'id' | 'messages' | 'createdAt' | 'updatedAt'> = {
      customerId: this.customer.id!,
      customerName: this.customer.name,
      customerPhone: this.customer.phone,
      customerEmail: this.customer.email,
      subject: this.conversationSubject,
      status: 'open',
      unreadCount: 0
    };

    this.messagingService.createConversation(conversation).subscribe({
      next: (newConversation) => {
        this.conversations.unshift(newConversation);
        this.selectedConversation = newConversation;
        this.conversationSubject = '';
        this.showNewConversationForm = false;
        this.messages = [];
      },
      error: (err) => console.error('Error creating conversation:', err)
    });
  }

  closeConversation(): void {
    if (!this.selectedConversation || !confirm('Fermer cette conversation?')) return;

    this.messagingService.closeConversation(this.selectedConversation.id!).subscribe({
      next: (updated) => {
        this.selectedConversation!.status = 'closed';
      },
      error: (err) => console.error('Error closing conversation:', err)
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
