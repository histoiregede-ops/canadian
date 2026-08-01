import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastMessage {
  message: string;
  type: ToastType;
}

/**
 * Service de notification toast global.
 * Émet un message via un BehaviorSubject, puis émet `null` après 3500ms.
 * Un nouvel appel à show() réinitialise le timer précédent.
 */
@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly toastSubject = new BehaviorSubject<ToastMessage | null>(null);
  private timeoutId: ReturnType<typeof setTimeout> | null = null;

  readonly toast$ = this.toastSubject.asObservable();

  show(message: string, type: ToastType): void {
    if (this.timeoutId !== null) {
      clearTimeout(this.timeoutId);
    }
    this.toastSubject.next({ message, type });
    this.timeoutId = setTimeout(() => this.dismiss(), 3500);
  }

  dismiss(): void {
    if (this.timeoutId !== null) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    this.toastSubject.next(null);
  }
}
