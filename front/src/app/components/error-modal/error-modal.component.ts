import { Component, OnDestroy, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';
import { AppError, ErrorModalService } from '../../services/error-modal.service';

@Component({
  selector: 'app-error-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './error-modal.component.html',
  styleUrls: ['./error-modal.component.css']
})
export class ErrorModalComponent implements OnInit, OnDestroy {
  error: AppError | null = null;
  showDetails = false;
  private readonly destroy$ = new Subject<void>();

  constructor(private errorModalService: ErrorModalService) {}

  ngOnInit(): void {
    this.errorModalService.error$
      .pipe(takeUntil(this.destroy$))
      .subscribe(error => {
        this.error = error;
        this.showDetails = false;
        if (error) {
          // Bloquer le scroll du body quand la modal est ouverte
          document.body.style.overflow = 'hidden';
        } else {
          document.body.style.overflow = '';
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    document.body.style.overflow = '';
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.dismiss();
  }

  dismiss(): void {
    this.errorModalService.dismiss();
  }

  onBackdropClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('error-modal-backdrop')) {
      this.dismiss();
    }
  }

  retry(): void {
    if (this.error?.retryAction) {
      const action = this.error.retryAction;
      this.dismiss();
      action();
    }
  }

  toggleDetails(): void {
    this.showDetails = !this.showDetails;
  }

  get isScrollable(): boolean {
    return !!this.error?.scrollable || !!this.error?.details;
  }

  get icon(): string {
    if (!this.error) return '⚠️';
    const icons: Record<string, string> = {
      error: '◉',
      warning: '▲',
      critical: '⬢',
      network: '⬡',
      auth: '⬣'
    };
    return icons[this.error.severity || 'error'] || '⚠️';
  }

  get iconClass(): string {
    if (!this.error) return 'error';
    return this.error.severity || 'error';
  }

  get title(): string {
    if (!this.error?.title) return 'Une erreur est survenue';
    return this.error.title;
  }

  copyRequestId(): void {
    if (this.error?.requestId) {
      navigator.clipboard.writeText(this.error.requestId).then(() => {
        // Petit feedback visuel pourrait être ajouté
      });
    }
  }

  copyDetails(): void {
    if (this.error?.details) {
      navigator.clipboard.writeText(this.error.details);
    }
  }
}
