import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { ToastService, ToastMessage, ToastType } from './toast.service';

describe('ToastService', () => {
  let service: ToastService;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [ToastService]
    });
    service = TestBed.inject(ToastService);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function capture(): { value: ToastMessage | null | undefined } {
    const captured: { value: ToastMessage | null | undefined } = { value: undefined };
    service.toast$.subscribe((toast) => (captured.value = toast));
    return captured;
  }

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should emit null by default (initial value)', () => {
    expect(capture().value).toBeNull();
  });

  it('show() should emit the message and its type', () => {
    const emitted = capture();
    service.show('Transfert enregistré', 'success');
    expect(emitted.value).toEqual({ message: 'Transfert enregistré', type: 'success' });
  });

  it('show() should emit the warning type', () => {
    const emitted = capture();
    service.show('Attention', 'warning');
    expect(emitted.value).toEqual({ message: 'Attention', type: 'warning' });
  });

  // Cas limite : message vide
  it('show() with an empty string should still emit the message (no validation)', () => {
    const emitted = capture();
    service.show('', 'error');
    expect(emitted.value).toEqual({ message: '', type: 'error' });
  });

  it('show() should override a previous toast message', () => {
    const emitted = capture();
    service.show('premier', 'info');
    service.show('second', 'success');
    expect(emitted.value).toEqual({ message: 'second', type: 'success' });
  });

  it('dismiss() should emit null', () => {
    const emitted = capture();
    service.show('message', 'info');
    service.dismiss();
    expect(emitted.value).toBeNull();
  });

  it('dismiss() with no active toast should emit null without error', () => {
    const emitted = capture();
    service.dismiss();
    expect(emitted.value).toBeNull();
  });

  it('should auto-dismiss after 3500ms', () => {
    vi.useFakeTimers();
    const emitted = capture();
    service.show('auto', 'warning');
    expect(emitted.value).toEqual({ message: 'auto', type: 'warning' });
    vi.advanceTimersByTime(3499);
    expect(emitted.value).not.toBeNull();
    vi.advanceTimersByTime(1);
    expect(emitted.value).toBeNull();
  });

  it('should NOT dismiss before 3500ms', () => {
    vi.useFakeTimers();
    const emitted = capture();
    service.show('avant', 'info');
    vi.advanceTimersByTime(3000);
    expect(emitted.value).toEqual({ message: 'avant', type: 'info' });
  });

  // Cas limite : nouvelle show() pendant un timer en cours -> reset du timer
  it('show() should reset the previous auto-dismiss timer', () => {
    vi.useFakeTimers();
    const emitted = capture();
    service.show('premier', 'info');
    vi.advanceTimersByTime(2000);
    service.show('deuxième', 'success');
    vi.advanceTimersByTime(3499);
    expect(emitted.value).toEqual({ message: 'deuxième', type: 'success' });
    vi.advanceTimersByTime(1);
    expect(emitted.value).toBeNull();
  });

  it('should emit each toast type correctly', () => {
    const types: ToastType[] = ['success', 'error', 'warning', 'info'];
    for (const type of types) {
      let last: ToastMessage | null | undefined;
      service.toast$.subscribe((t) => (last = t));
      service.show('msg', type);
      expect(last).toEqual({ message: 'msg', type });
    }
  });
});
