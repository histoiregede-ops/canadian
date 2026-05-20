import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, interval, switchMap, startWith } from 'rxjs';
import { WebSocketService } from './websocket';
import { environment } from '../../environments/environment';


export interface Message {
  id?: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderRole: 'customer' | 'admin' | 'support';
  content: string;
  attachmentUrl?: string;
  readAt?: Date;
  createdAt?: Date;
}

export interface Conversation {
  id?: string;
  customerId: string;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  subject: string;
  status: 'open' | 'pending' | 'closed';
  lastMessage?: string;
  unreadCount: number;
  createdAt?: Date;
  updatedAt?: Date;
  messages?: Message[];
}

@Injectable({
  providedIn: 'root'
})
export class MessagingService {
  private apiUrl = `${environment.apiUrl}/api/messages`;
  private newMessageSubject = new BehaviorSubject<Message | null>(null);
  public newMessage$ = this.newMessageSubject.asObservable();

  private typingSubject = new BehaviorSubject<{conversationId: string, userId: string, isTyping: boolean} | null>(null);
  public typing$ = this.typingSubject.asObservable();

  private pollingInterval = 30000; // 30 seconds fallback polling
  private currentConversationId: string | null = null;

  constructor(
    private http: HttpClient,
    private wsService: WebSocketService
  ) {
    this.initializeRealTimeMessaging();
  }

  private initializeRealTimeMessaging(): void {
    // Listen for WebSocket messages
    this.wsService.newMessage$.subscribe(message => {
      if (message) {
        this.newMessageSubject.next(message);
      }
    });

    this.wsService.typing$.subscribe(typing => {
      if (typing) {
        this.typingSubject.next(typing);
      }
    });

    // Fallback polling for conversations list
    this.startPollingConversations();
  }

  private startPollingConversations(): void {
    interval(this.pollingInterval)
      .pipe(
        startWith(0),
        switchMap(() => {
          const customerId = localStorage.getItem('customerId');
          if (customerId) {
            return this.getConversations(customerId);
          }
          return [];
        })
      )
      .subscribe();
  }

  // Get all conversations for a customer
  getConversations(customerId: string): Observable<Conversation[]> {
    return this.http.get<Conversation[]>(`${this.apiUrl}/conversations/${customerId}`);
  }

  // Get all conversations for admin
  getAllConversations(): Observable<Conversation[]> {
    return this.http.get<Conversation[]>(`${this.apiUrl}/conversations?all=true`);
  }

  // Get conversation by ID
  getConversation(conversationId: string): Observable<Conversation> {
    return this.http.get<Conversation>(`${this.apiUrl}/conversations/${conversationId}`);
  }

  // Create new conversation
  createConversation(conversation: Omit<Conversation, 'id' | 'messages' | 'createdAt' | 'updatedAt'>): Observable<Conversation> {
    return this.http.post<Conversation>(`${this.apiUrl}/conversations`, conversation);
  }

  // Send message via WebSocket if connected, fallback to HTTP
  sendMessage(message: Omit<Message, 'id' | 'createdAt'>): Observable<Message> {
    if (this.wsService.isConnected()) {
      this.wsService.sendMessage(message);
      // WebSocket handles broadcast back, return empty observable
      return new Observable(subscriber => {
        subscriber.complete();
      });
    } else {
      // Fallback to HTTP
      return this.http.post<Message>(`${this.apiUrl}/send`, message);
    }
  }

  // Get messages for conversation
  getMessages(conversationId: string): Observable<Message[]> {
    return this.http.get<Message[]>(`${this.apiUrl}/conversations/${conversationId}/messages`);
  }

  // Mark message as read
  markAsRead(messageId: string): Observable<Message> {
    return this.http.patch<Message>(`${this.apiUrl}/${messageId}/read`, {});
  }

  // Close conversation
  closeConversation(conversationId: string): Observable<Conversation> {
    return this.http.patch<Conversation>(`${this.apiUrl}/conversations/${conversationId}/close`, {});
  }

  // Join conversation for real-time updates
  joinConversation(conversationId: string): void {
    this.currentConversationId = conversationId;
    if (this.wsService.isConnected()) {
      this.wsService.joinConversation(conversationId);
    }
  }

  // Leave conversation
  leaveConversation(conversationId: string): void {
    if (this.wsService.isConnected()) {
      this.wsService.leaveConversation(conversationId);
    }
    this.currentConversationId = null;
  }

  // Typing indicators
  startTyping(conversationId: string): void {
    if (this.wsService.isConnected()) {
      this.wsService.startTyping(conversationId);
    }
  }

  stopTyping(conversationId: string): void {
    if (this.wsService.isConnected()) {
      this.wsService.stopTyping(conversationId);
    }
  }

  // Emit new message (called from polling or WebSocket)
  receiveMessage(message: Message): void {
    this.newMessageSubject.next(message);
  }

  // Get WebSocket connection status
  getConnectionStatus(): Observable<'connecting' | 'connected' | 'disconnected'> {
    return this.wsService.connectionStatus$;
  }
}
