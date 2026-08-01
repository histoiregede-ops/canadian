import { TestBed } from '@angular/core/testing';
import { fakeAsync, tick } from '@angular/core/testing';
import { ToastService, ToastMessage, ToastType } from './toast.service';

describe('ToastService', () => {
  let service: ToastService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ToastService]
    });
    service = TestBed.inject(ToastService);
  });

  function capture(): ToastMessage | null | undefined {
    let emitted: ToastMessage | null | undefined;
    service.toast$.subscribe((t) => (emitted = t));
    return emitted;
  }

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should emit null by default (initial value)', () => {
    expect(capture()).toBeNull();
  });

  it('show() should emit the message and its type', () => {
    const emitted = capture();
    service.show('Transfert enregistré', 'success');
    expect(emitted).toEqual({ message: 'Transfert enregistré', type: 'success' });
  });

  it('show() should emit the warning type', () => {
    const emitted = capture();
    service.show('Attention', 'warning');
    expect(emitted).toEqual({ message: 'Attention', type: 'warning' });
  });

  // Cas limite : message vide
  it('show() with an empty string should still emit the message (no validation)', () => {
    const emitted = capture();
    service.show('', 'error');
    expect(emitted).toEqual({ message: '', type: 'error' });
  });

  it('show() should override a previous toast message', () => {
    const emitted = capture();
    service.show('premier', 'info');
    service.show('second', 'success');
    expect(emitted).toEqual({ message: 'second', type: 'success' });
  });

  it('dismiss() should emit null', () => {
    const emitted = capture();
    service.show('message', 'info');
    service.dismiss();
    expect(emitted).toBeNull();
  });

  it('dismiss() with no active toast should emit null without error', () => {
    const emitted = capture();
    service.dismiss();
    expect(emitted).toBeNull();
  });

  it('should auto-dismiss after 3500ms', fakeAsync(() => {
    const emitted = capture();
    service.show('auto', 'warning');
    expect(emitted).toEqual({ message: 'auto', type: 'warning' });
    tick(3499);
    expect(emitted).not.toBeNull();
    tick(1);
    expect(emitted).toBeNull();
  }));

  it('should NOT dismiss before 3500ms', fakeAsync(() => {
    const emitted = capture();
    service.show('avant', 'info');
    tick(3000);
    expect(emitted).toEqual({ message: 'avant', type: 'info' });
  }));

  // Cas limite : nouvelle show() pendant un timer en cours -> reset du timer
  it('show() should reset the previous auto-dismiss timer', fakeAsync(() => {
    const emitted = capture();
    service.show('premier', 'info');
    tick(2000);
    service.show('deuxième', 'success');
    tick(3499);
    expect(emitted).toEqual({ message: 'deuxième', type: 'success' });
    tick(1);
    expect(emitted).toBeNull();
  }));

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
