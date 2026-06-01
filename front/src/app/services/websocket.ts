import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Message } from './messaging';
import { environment } from '../../environments/environment';
import { CustomerAuthService } from './customer-auth';

@Injectable({
  providedIn: 'root'
})
export class WebSocketService {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  private connectionStatus = new BehaviorSubject<'connecting' | 'connected' | 'disconnected'>('disconnected');
  public connectionStatus$ = this.connectionStatus.asObservable();

  private newMessageSubject = new BehaviorSubject<Message | null>(null);
  public newMessage$ = this.newMessageSubject.asObservable();

  private typingSubject = new BehaviorSubject<{conversationId: string, userId: string, isTyping: boolean} | null>(null);
  public typing$ = this.typingSubject.asObservable();

  private notificationSubject = new BehaviorSubject<{title: string, body: string, type: string} | null>(null);
  public notification$ = this.notificationSubject.asObservable();

  constructor(private customerAuth: CustomerAuthService) {
    this.requestNotificationPermission();
    this.connect();
  }

  private connect(): void {
    try {
      this.connectionStatus.next('connecting');

      const wsUrl = `${environment.socketUrl.replace(/^http/, 'ws')}/ws`;

      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('WebSocket connected');
        this.connectionStatus.next('connected');
        this.reconnectAttempts = 0;

        const customer = this.customerAuth.getCurrentCustomer();
        if (customer?.id) {
          this.send('auth', { customerId: customer.id });
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleMessage(data);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      this.ws.onclose = () => {
        console.log('WebSocket disconnected');
        this.connectionStatus.next('disconnected');
        this.attemptReconnect();
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.connectionStatus.next('disconnected');
      };

    } catch (error) {
      console.error('Error connecting to WebSocket:', error);
      this.attemptReconnect();
    }
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);

      setTimeout(() => {
        this.connect();
      }, this.reconnectDelay * this.reconnectAttempts);
    }
  }

  private handleMessage(data: any): void {
    switch (data.type) {
      case 'new_message':
        this.newMessageSubject.next(data.message);
        this.showNotification({
          title: 'Nouveau message',
          body: `${data.message.senderName}: ${this.truncate(data.message.content, 90)}`,
          type: 'message'
        });
        break;
      case 'typing':
        this.typingSubject.next(data);
        break;
      case 'conversation_updated':
        break;
      case 'notification':
        this.showNotification(data.notification);
        break;
      default:
        console.log('Unknown message type:', data.type);
    }
  }

  private send(type: string, payload: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, ...payload }));
    }
  }

  private requestNotificationPermission(): void {
    if (!('Notification' in window)) return;
    if (Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }
  }

  private playSound(): void {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(440, audioCtx.currentTime);
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.15);
    } catch (error) {
      console.error('Notification sound failed:', error);
    }
  }

  private truncate(text: string, maxLength: number): string {
    if (!text) return '';
    return text.length <= maxLength ? text : `${text.slice(0, maxLength)}...`;
  }

  // Public methods
  sendMessage(message: Omit<Message, 'id' | 'createdAt'>): void {
    this.send('send_message', { message });
  }

  startTyping(conversationId: string): void {
    this.send('typing', { conversationId, isTyping: true });
  }

  stopTyping(conversationId: string): void {
    this.send('typing', { conversationId, isTyping: false });
  }

  joinConversation(conversationId: string): void {
    this.send('join_conversation', { conversationId });
  }

  leaveConversation(conversationId: string): void {
    this.send('leave_conversation', { conversationId });
  }

  private showNotification(notification: any): void {
    this.notificationSubject.next(notification);
    this.playSound();
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(notification.title, {
        body: notification.body,
        icon: '/favicon.ico'
      });
    }
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}
