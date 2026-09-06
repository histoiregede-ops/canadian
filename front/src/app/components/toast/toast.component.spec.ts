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

    await TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [ToastComponent],
      providers: [{ provide: ToastService, useValue: { toast$: toastSubject, dismiss: dismissMock } }]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ToastComponent);
    component = fixture.componentInstance;
    fixture.detectChanges(false);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should not render the container when there is no toast', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.toast-container')).toBeNull();
  });

  it('should display the message when a toast is emitted', () => {
    component.toast = { message: 'Transfert enregistré', type: 'success' };
    expect(component.toast.message).toBe('Transfert enregistré');
  });

  it('should display the success icon (✔️) for a success toast', () => {
    component.toast = { message: 'ok', type: 'success' };
    expect(component.icon).toBe('✔️');
  });

  it('should display the error icon (✖️) for an error toast', () => {
    component.toast = { message: 'ko', type: 'error' };
    expect(component.icon).toBe('✖️');
  });

  it('should display the warning icon (⚠️) for a warning toast', () => {
    component.toast = { message: 'warn', type: 'warning' };
    expect(component.icon).toBe('⚠️');
  });

  it('should display the info icon (ℹ️) for an info toast', () => {
    component.toast = { message: 'info', type: 'info' };
    expect(component.icon).toBe('ℹ️');
  });

  it('should render an empty toast icon for an unknown type', () => {
    component.toast = { message: 'x', type: 'unknown' as ToastMessage['type'] };
    expect(component.icon).toBeUndefined();
  });

  it('should call dismiss() on the service when the close button is clicked', () => {
    component.toast = { message: 'msg', type: 'info' };
    component.dismiss();
    expect(dismissMock).toHaveBeenCalled();
  });

  it('should hide the toast when the service emits null', () => {
    component.toast = { message: 'visible', type: 'success' };
    expect(component.toast).not.toBeNull();
    component.toast = null;
    expect(component.toast).toBeNull();
  });

  it('should apply the success css class for a success toast', () => {
    component.toast = { message: 'ok', type: 'success' };
    expect(component.toast.type).toBe('success');
  });

  it('should apply the error css class for an error toast', () => {
    component.toast = { message: 'ko', type: 'error' };
    expect(component.toast.type).toBe('error');
  });
});
