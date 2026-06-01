import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MessagingService, Conversation, Message } from '../../services/messaging';
import { AuthService } from '../../services/auth';
import { Subscription, interval } from 'rxjs';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-messages',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './messages.component.html',
  styleUrls: ['./messages.component.css']
})
export class MessagesComponent implements OnInit, OnDestroy {
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

  isAdmin = false;
  currentUser: any = null;
  notificationMessage = '';
  showNotificationBanner = false;
  private subscriptions = new Subscription();
  private pollInterval: Subscription | null = null;

  constructor(
    private messagingService: MessagingService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getUser();
    this.isAdmin = this.currentUser?.role === 'admin' || this.currentUser?.role === 'support';
    this.loadConversations();
    this.setupRealTime();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    if (this.pollInterval) this.pollInterval.unsubscribe();
  }

  loadConversations(): void {
    if (this.isAdmin) {
      this.messagingService.getAllConversations().subscribe({
        next: (data) => {
          this.conversations = data;
          this.loading = false;
          if (data.length > 0 && !this.selectedConversation) {
            this.selectConversation(data[0]);
          }
        },
        error: (err) => {
          console.error('Error loading admin conversations:', err);
          this.loading = false;
        }
      });
      return;
    }

    const customerId = localStorage.getItem('customerId') || 'guest_user';

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
    if (!this.newMessage.trim() || !this.selectedConversation) {
      return;
    }

    this.sendingMessage = true;
    const senderRole = this.isAdmin ? 'admin' : 'customer';
    const message: Omit<Message, 'id' | 'createdAt'> = {
      conversationId: this.selectedConversation.id!,
      senderId: senderRole === 'admin' ? 'admin_' + Date.now() : 'customer_' + Date.now(),
      senderName: this.currentUser?.fullName || localStorage.getItem('customerName') || 'Client',
      senderRole,
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
    if (!this.conversationSubject.trim()) return;

    const customerId = this.currentUser?.id || localStorage.getItem('customerId') || 'guest_user';
    const conversation: Omit<Conversation, 'id' | 'messages' | 'createdAt' | 'updatedAt'> = {
      customerId,
      customerName: this.currentUser?.fullName || localStorage.getItem('customerName') || 'Client',
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
      error: (err) => {
        console.error('Error creating conversation:', err);
        this.notificationMessage = 'Erreur lors de la création de la conversation';
        this.showNotificationBanner = true;
        setTimeout(() => this.showNotificationBanner = false, 4000);
      }
    });
  }

  closeConversation(): void {
    if (!this.selectedConversation) return;

    this.messagingService.closeConversation(this.selectedConversation.id!).subscribe({
      next: () => {
        if (this.selectedConversation) {
          this.selectedConversation.status = 'closed';
        }
      },
      error: (err) => console.error('Error closing conversation:', err)
    });
  }

  private setupRealTime(): void {
    // Listen for new messages via WebSocket
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
      this.messagingService.notification$.subscribe(notification => {
        if (notification) {
          this.displayNotification(notification);
        }
      })
    );

    // Listen for typing indicators
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

    // Refresh conversations when we get new messages
    this.subscriptions.add(
      this.messagingService.newMessage$.subscribe(() => {
        this.loadConversations();
      })
    );
  }

  private displayNotification(notification: { title: string; body: string; type: string }): void {
    this.notificationMessage = `${notification.title} — ${notification.body}`;
    this.showNotificationBanner = true;
    setTimeout(() => {
      this.showNotificationBanner = false;
    }, 6000);
  }

  private scrollToBottom(): void {
    setTimeout(() => {
      const container = this.messagesContainer?.nativeElement;
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
    }, 100);
  }
}
