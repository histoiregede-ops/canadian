import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { BehaviorSubject } from 'rxjs';
import { ToastComponent } from './toast.component';
import { ToastMessage, ToastService } from '../../services/toast.service';

describe('ToastComponent', () => {
  let component: ToastComponent;
  let fixture: ComponentFixture<ToastComponent>;
  let toastSubject: BehaviorSubject<ToastMessage | null>;
  let dismissMock: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    toastSubject = new BehaviorSubject<ToastMessage | null>(null);
    dismissMock = vi.fn();

    await TestBed.configureTestingModule({
      imports: [ToastComponent],
      providers: [{ provide: ToastService, useValue: { toast$: toastSubject, dismiss: dismissMock } }]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ToastComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should not render the container when there is no toast', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.toast-container')).toBeNull();
  });

  it('should display the message when a toast is emitted', () => {
    toastSubject.next({ message: 'Transfert enregistré', type: 'success' });
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.toast-body')?.textContent).toContain('Transfert enregistré');
  });

  it('should display the success icon (✔️) for a success toast', () => {
    toastSubject.next({ message: 'ok', type: 'success' });
    fixture.detectChanges();
    const icon = fixture.nativeElement.querySelector('.toast-icon')?.textContent;
    expect(icon).toContain('✔️');
  });

  it('should display the error icon (✖️) for an error toast', () => {
    toastSubject.next({ message: 'ko', type: 'error' });
    fixture.detectChanges();
    const icon = fixture.nativeElement.querySelector('.toast-icon')?.textContent;
    expect(icon).toContain('✖️');
  });

  it('should display the warning icon (⚠️) for a warning toast', () => {
    toastSubject.next({ message: 'warn', type: 'warning' });
    fixture.detectChanges();
    const icon = fixture.nativeElement.querySelector('.toast-icon')?.textContent;
    expect(icon).toContain('⚠️');
  });

  it('should display the info icon (ℹ️) for an info toast', () => {
    toastSubject.next({ message: 'info', type: 'info' });
    fixture.detectChanges();
    const icon = fixture.nativeElement.querySelector('.toast-icon')?.textContent;
    expect(icon).toContain('ℹ️');
  });

  it('should render an empty toast icon for an unknown type', () => {
    toastSubject.next({ message: 'x', type: 'unknown' as ToastMessage['type'] });
    fixture.detectChanges();
    const icon = fixture.nativeElement.querySelector('.toast-icon')?.textContent;
    expect(icon).toBe('');
  });

  it('should call dismiss() on the service when the close button is clicked', () => {
    toastSubject.next({ message: 'msg', type: 'info' });
    fixture.detectChanges();
    const closeButton = fixture.nativeElement.querySelector('.toast-close') as HTMLButtonElement;
    expect(closeButton).toBeTruthy();
    closeButton.click();
    expect(dismissMock).toHaveBeenCalled();
  });

  it('should hide the toast when the service emits null', () => {
    toastSubject.next({ message: 'visible', type: 'success' });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.toast-container')).toBeTruthy();
    toastSubject.next(null);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.toast-container')).toBeNull();
  });

  it('should apply the success css class for a success toast', () => {
    toastSubject.next({ message: 'ok', type: 'success' });
    fixture.detectChanges();
    const card = fixture.nativeElement.querySelector('.toast-card') as HTMLElement;
    expect(card.classList.contains('toast-card--success')).toBe(true);
  });

  it('should apply the error css class for an error toast', () => {
    toastSubject.next({ message: 'ko', type: 'error' });
    fixture.detectChanges();
    const card = fixture.nativeElement.querySelector('.toast-card') as HTMLElement;
    expect(card.classList.contains('toast-card--error')).toBe(true);
  });
});
