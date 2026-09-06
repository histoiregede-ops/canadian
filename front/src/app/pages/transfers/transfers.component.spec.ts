import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { vi } from 'vitest';
import { TransfersComponent } from './transfers.component';
import { TransferService, Transfer, TransferSummary } from '../../services/transfer';
import { ToastService } from '../../services/toast.service';

/**
 * Tests unitaires + fonctionnels du composant TransfersComponent.
 * Couvre le pattern production-ready : guard anti-double-clic,
 * finalize(), mise à jour de liste, gestion d'erreurs et template.
 */
describe('TransfersComponent', () => {
  let component: TransfersComponent;
  let fixture: ComponentFixture<TransfersComponent>;
  let transferServiceMock: {
    getTransfers: ReturnType<typeof vi.fn>;
    getDailySummary: ReturnType<typeof vi.fn>;
    createTransfer: ReturnType<typeof vi.fn>;
    updateTransfer: ReturnType<typeof vi.fn>;
    deleteTransfer: ReturnType<typeof vi.fn>;
    confirmTransfer: ReturnType<typeof vi.fn>;
    failTransfer: ReturnType<typeof vi.fn>;
  };
  let toastMock: { show: ReturnType<typeof vi.fn> };

  const transfer: Transfer = {
    id: 'T1',
    operator: 'wave',
    type: 'sent',
    transferType: 'national',
    country: 'ML',
    amount: 5000,
    fees: 50,
    status: 'pending',
    customerPhone: '76000000',
    createdAt: '2026-01-01T10:00:00.000Z'
  };

  const listResponse = { data: [transfer], total: 1, page: 1, pages: 1 };

  const summary: TransferSummary = {
    totalSent: 5000,
    totalReceived: 0,
    totalFees: 50,
    count: 1,
    byOperator: {}
  };

  beforeEach(async () => {
    transferServiceMock = {
      getTransfers: vi.fn().mockReturnValue(of(listResponse)),
      getDailySummary: vi.fn().mockReturnValue(of(summary)),
      createTransfer: vi.fn(),
      updateTransfer: vi.fn(),
      deleteTransfer: vi.fn(),
      confirmTransfer: vi.fn(),
      failTransfer: vi.fn()
    };
    toastMock = { show: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [TransfersComponent, CommonModule, FormsModule],
      providers: [
        { provide: TransferService, useValue: transferServiceMock },
        { provide: ToastService, useValue: toastMock },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { data: { data: { transfers: listResponse, summary } } }
          }
        }
      ]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(TransfersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create and load the resolved data', () => {
    expect(component).toBeTruthy();
    expect(component.transfers.length).toBe(1);
    expect(component.transfers[0].id).toBe('T1');
    expect(component.summary).toEqual(summary);
    expect(component.totalPages).toBe(1);
    expect(component.loading).toBe(false);
  });

  describe('saveTransfer()', () => {
    it('should NOT call the service when the operator is missing', () => {
      component.form.operator = '';
      component.form.amount = 1000;
      component.saveTransfer();
      expect(transferServiceMock.createTransfer).not.toHaveBeenCalled();
    });

    it('should NOT call the service when the amount is 0', () => {
      component.form.operator = 'wave';
      component.form.amount = 0;
      component.saveTransfer();
      expect(transferServiceMock.createTransfer).not.toHaveBeenCalled();
    });

    it('should send the payload and show a success toast, then reset the form', () => {
      transferServiceMock.createTransfer.mockReturnValue(of({ ...transfer, id: 'T2' }));
      component.form.operator = 'wave';
      component.form.amount = 10000;
      component.form.fees = 100;
      component.form.note = 'test';
      component.saveTransfer();

      expect(transferServiceMock.createTransfer).toHaveBeenCalledTimes(1);
      const payload = transferServiceMock.createTransfer.mock.calls[0][0];
      expect(payload.operator).toBe('wave');
      expect(payload.amount).toBe(10000);
      expect(payload.country).toBe('ML');

      expect(toastMock.show).toHaveBeenCalledWith('Transfert enregistré avec succès', 'success');
      expect(component.form.amount).toBe(0);
      expect(component.form.operator).toBe('');
      expect(component.submitting).toBe(false);
      expect(transferServiceMock.getTransfers).toHaveBeenCalled(); // reload
      expect(transferServiceMock.getDailySummary).toHaveBeenCalled(); // reload summary
    });

    it('should call updateTransfer (not createTransfer) when editing', () => {
      transferServiceMock.updateTransfer.mockReturnValue(of({ ...transfer, id: 'T1' }));
      component.editing = true;
      component.editingTransferId = 'T1';
      component.form.operator = 'wave';
      component.form.amount = 1000;
      component.saveTransfer();
      expect(transferServiceMock.updateTransfer).toHaveBeenCalledWith('T1', expect.any(Object));
      expect(transferServiceMock.createTransfer).not.toHaveBeenCalled();
      expect(toastMock.show).toHaveBeenCalledWith('Transfert mis à jour avec succès', 'success');
    });

    it('should send a negative amount to the API (no client-side validation)', () => {
      transferServiceMock.createTransfer.mockReturnValue(of({ ...transfer }));
      component.form.operator = 'wave';
      component.form.amount = -1000;
      component.saveTransfer();
      const payload = transferServiceMock.createTransfer.mock.calls[0][0];
      expect(payload.amount).toBe(-1000);
    });

    it('should show an error toast with the API message on failure', () => {
      transferServiceMock.createTransfer.mockReturnValue(
        throwError(() => ({ error: { error: 'Solde insuffisant' } }))
      );
      component.form.operator = 'wave';
      component.form.amount = 1000;
      component.saveTransfer();
      expect(toastMock.show).toHaveBeenCalledWith('Solde insuffisant', 'error');
      expect(component.submitting).toBe(false);
    });

    it('should show a default error toast when the API error has no message', () => {
      transferServiceMock.createTransfer.mockReturnValue(throwError(() => ({})));
      component.form.operator = 'wave';
      component.form.amount = 1000;
      component.saveTransfer();
      expect(toastMock.show).toHaveBeenCalledWith(
        'Erreur lors de l’enregistrement du transfert, veuillez réessayer',
        'error'
      );
      expect(component.submitting).toBe(false);
    });

    it('should set submitting=true while the request is in flight and reset it after completion', () => {
      const pending = new Subject<any>();
      transferServiceMock.createTransfer.mockReturnValue(pending);
      component.form.operator = 'wave';
      component.form.amount = 1000;
      component.saveTransfer();
      expect(component.submitting).toBe(true);
      pending.complete();
      expect(component.submitting).toBe(false);
    });

    it('should NOT submit again while a submission is in progress (anti-double-click)', () => {
      const pending = new Subject<any>();
      transferServiceMock.createTransfer.mockReturnValue(pending);
      component.form.operator = 'wave';
      component.form.amount = 1000;
      component.saveTransfer();
      component.saveTransfer();
      component.saveTransfer();
      expect(transferServiceMock.createTransfer).toHaveBeenCalledTimes(1);
      pending.complete();
    });
  });

  describe('deleteTransfer()', () => {
    it('should call deleteTransfer, show a success toast and reload transfers', () => {
      vi.spyOn(window, 'confirm').mockReturnValue(true);
      transferServiceMock.deleteTransfer.mockReturnValue(of(undefined));
      component.deleteTransfer('T1');
      expect(transferServiceMock.deleteTransfer).toHaveBeenCalledWith('T1');
      expect(toastMock.show).toHaveBeenCalledWith('Transfert supprimé', 'success');
      expect(transferServiceMock.getTransfers).toHaveBeenCalled();
      expect(component.deletingId).toBeNull();
    });

    it('should NOT call the service when the confirmation is cancelled', () => {
      vi.spyOn(window, 'confirm').mockReturnValue(false);
      component.deleteTransfer('T1');
      expect(transferServiceMock.deleteTransfer).not.toHaveBeenCalled();
    });

    it('should show an error toast with the API message on failure', () => {
      vi.spyOn(window, 'confirm').mockReturnValue(true);
      transferServiceMock.deleteTransfer.mockReturnValue(
        throwError(() => ({ error: { error: 'Déjà utilisé' } }))
      );
      component.deleteTransfer('T1');
      expect(toastMock.show).toHaveBeenCalledWith('Déjà utilisé', 'error');
      expect(component.deletingId).toBeNull();
    });

    it('should NOT call the service again while a delete is pending (anti-double-click)', () => {
      vi.spyOn(window, 'confirm').mockReturnValue(true);
      const pending = new Subject<any>();
      transferServiceMock.deleteTransfer.mockReturnValue(pending);
      component.deleteTransfer('T1');
      expect(component.deletingId).toBe('T1');
      component.deleteTransfer('T1');
      expect(transferServiceMock.deleteTransfer).toHaveBeenCalledTimes(1);
      pending.next(undefined);
      pending.complete();
      expect(component.deletingId).toBeNull();
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });
  });

  describe('confirm()', () => {
    it('should call confirmTransfer, show a success toast and reload transfers', () => {
      transferServiceMock.confirmTransfer.mockReturnValue(of({ ...transfer, status: 'completed' }));
      component.confirm('T1');
      expect(transferServiceMock.confirmTransfer).toHaveBeenCalledWith('T1');
      expect(toastMock.show).toHaveBeenCalledWith('Transfert validé avec succès', 'success');
      expect(transferServiceMock.getTransfers).toHaveBeenCalled();
    });

    it('should show an error toast with the API message on failure', () => {
      transferServiceMock.confirmTransfer.mockReturnValue(
        throwError(() => ({ error: { error: 'Déjà validé' } }))
      );
      component.confirm('T1');
      expect(toastMock.show).toHaveBeenCalledWith('Déjà validé', 'error');
    });

    it('should show the default error toast when the API error has no message', () => {
      transferServiceMock.confirmTransfer.mockReturnValue(throwError(() => ({})));
      component.confirm('T1');
      expect(toastMock.show).toHaveBeenCalledWith('Échec de la validation, veuillez réessayer', 'error');
    });

    it('should set confirmingId while the call is pending and reset it after', () => {
      const pending = new Subject<any>();
      transferServiceMock.confirmTransfer.mockReturnValue(pending);
      component.confirm('T1');
      expect(component.confirmingId).toBe('T1');
      pending.next(transfer);
      pending.complete();
      expect(component.confirmingId).toBeNull();
    });

    it('should ignore a second call while a confirm is pending', () => {
      const pending = new Subject<any>();
      transferServiceMock.confirmTransfer.mockReturnValue(pending);
      component.confirm('T1');
      component.confirm('T1');
      expect(transferServiceMock.confirmTransfer).toHaveBeenCalledTimes(1);
      pending.complete();
    });
  });

  describe('fail()', () => {
    it('should call failTransfer, show a success toast and reload transfers', () => {
      transferServiceMock.failTransfer.mockReturnValue(of({ ...transfer, status: 'failed' }));
      component.fail('T1');
      expect(transferServiceMock.failTransfer).toHaveBeenCalledWith('T1');
      expect(toastMock.show).toHaveBeenCalledWith('Transfert rejeté', 'success');
      expect(transferServiceMock.getTransfers).toHaveBeenCalled();
    });

    it('should show an error toast with the API message on failure', () => {
      transferServiceMock.failTransfer.mockReturnValue(
        throwError(() => ({ error: { error: 'Non modifiable' } }))
      );
      component.fail('T1');
      expect(toastMock.show).toHaveBeenCalledWith('Non modifiable', 'error');
    });

    it('should set failingId while the call is pending and reset it after', () => {
      const pending = new Subject<any>();
      transferServiceMock.failTransfer.mockReturnValue(pending);
      component.fail('T1');
      expect(component.failingId).toBe('T1');
      pending.next(transfer);
      pending.complete();
      expect(component.failingId).toBeNull();
    });
  });

  describe('template / disabled states', () => {
    it('should disable the confirm/fail buttons while a confirm is in flight', () => {
      const pending = new Subject<any>();
      transferServiceMock.confirmTransfer.mockReturnValue(pending);

      component.confirm('T1');
      expect(component.confirmingId).toBe('T1');

      pending.next(transfer);
      pending.complete();
      expect(component.confirmingId).toBeNull();
    });

    it('should disable the submit button when operator or amount is missing', () => {
      component.form.operator = '';
      component.form.amount = 0;
      expect(!component.form.operator || !component.form.amount || component.submitting).toBe(true);

      component.form.operator = 'wave';
      component.form.amount = 500;
      expect(!component.form.operator || !component.form.amount || component.submitting).toBe(false);
    });
  });

  describe('pagination', () => {
    it('should ignore pages below 1', () => {
      transferServiceMock.getTransfers.mockClear();
      component.pageChanged(0);
      expect(transferServiceMock.getTransfers).not.toHaveBeenCalled();
    });

    it('should ignore pages above totalPages', () => {
      transferServiceMock.getTransfers.mockClear();
      component.totalPages = 3;
      component.pageChanged(4);
      expect(transferServiceMock.getTransfers).not.toHaveBeenCalled();
      expect(component.page).toBe(1);
    });

    it('should load transfers when the page is valid', () => {
      transferServiceMock.getTransfers.mockClear();
      component.totalPages = 5;
      component.pageChanged(3);
      expect(component.page).toBe(3);
      expect(transferServiceMock.getTransfers).toHaveBeenCalled();
    });
  });

  describe('helpers', () => {
    it('should return the operator label', () => {
      expect(component.operatorLabel('orange_money')).toBe('Orange Money');
      expect(component.operatorLabel('unknown_op')).toBe('unknown_op');
    });

    it('should return the status label', () => {
      expect(component.statusLabel('pending')).toBe('En attente');
      expect(component.statusLabel('completed')).toBe('Complété');
    });

    it('should return the transfer type label', () => {
      expect(component.transferTypeLabel('international')).toBe('International');
      expect(component.transferTypeLabel('national')).toBe('National');
      expect(component.transferTypeLabel(undefined)).toBe('National');
    });

    it('should return a default flag for unknown countries', () => {
      expect(component.countryFlag('XX')).toBe('🌍');
      expect(component.countryName('XX')).toBe('XX');
    });
  });
});