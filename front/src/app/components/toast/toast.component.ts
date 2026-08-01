import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ToastMessage, ToastService, ToastType } from '../../services/toast.service';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './toast.component.html',
  styleUrls: ['./toast.component.css']
})
export class ToastComponent implements OnInit, OnDestroy {
  toast: ToastMessage | null = null;

  private readonly destroy$ = new Subject<void>();

  constructor(private toastService: ToastService) {}

  ngOnInit(): void {
    this.toastService.toast$
      .pipe(takeUntil(this.destroy$))
      .subscribe((toast) => {
        this.toast = toast;
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get icon(): string {
    if (!this.toast) return '';
    const icons: Record<ToastType, string> = {
      success: '✔️',
      error: '✖️',
      warning: '⚠️',
      info: 'ℹ️'
    };
    return icons[this.toast.type];
  }

  dismiss(): void {
    this.toastService.dismiss();
  }
}
