import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { FinanceService, Transaction } from './finance.service';

describe('FinanceService', () => {
  let service: FinanceService;
  let httpMock: HttpTestingController;

  const API = 'http://localhost:3000/api/finance';

  const tx: Transaction = {
    id: 'tx1',
    date: '2026-01-01',
    description: 'Vente',
    type: 'income',
    amount: 5000
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [FinanceService, provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(FinanceService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getFinanceData', () => {
    it('should call GET /transactions', () => {
      service.getFinanceData().subscribe();
      const req = httpMock.expectOne(`${API}/transactions`);
      expect(req.request.method).toBe('GET');
      req.flush([tx]);
    });

    it('should propagate HTTP errors', () => {
      let error: any;
      service.getFinanceData().subscribe({ error: (e) => (error = e) });
      const req = httpMock.expectOne(`${API}/transactions`);
      req.flush('Server Error', { status: 500, statusText: 'Internal Server Error' });
      expect(error.status).toBe(500);
    });
  });

  describe('createTransaction', () => {
    it('should POST the transaction to /transactions', () => {
      const body: Partial<Transaction> = { date: '2026-01-01', description: 'Vente', type: 'income', amount: 5000 };
      service.createTransaction(body).subscribe();
      const req = httpMock.expectOne(`${API}/transactions`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(body);
      req.flush({ id: 'tx1', ...body });
    });

    // Cas limite : payload partiel / vide -> envoyé tel quel
    it('should POST a partial payload without validation', () => {
      service.createTransaction({ amount: 0 } as any).subscribe();
      const req = httpMock.expectOne(`${API}/transactions`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ amount: 0 });
      req.flush({ id: 'tx1' });
    });
  });

  describe('getDailyReport', () => {
    it('should call GET /daily-report without params when dates are missing', () => {
      service.getDailyReport().subscribe();
      const req = httpMock.expectOne(`${API}/daily-report`);
      expect(req.request.method).toBe('GET');
      req.flush([]);
    });

    it('should include startDate and endDate when provided', () => {
      service.getDailyReport('2026-01-01', '2026-01-31').subscribe();
      const req = httpMock.expectOne(`${API}/daily-report?startDate=2026-01-01&endDate=2026-01-31`);
      expect(req.request.method).toBe('GET');
      req.flush([]);
    });

    // Cas limite : seulement la date de début -> seul startDate est envoyé
    it('should include only startDate when endDate is missing', () => {
      service.getDailyReport('2026-01-01').subscribe();
      const req = httpMock.expectOne(`${API}/daily-report?startDate=2026-01-01`);
      req.flush([]);
    });
  });

  describe('getFluxJournalier', () => {
    it('should call GET /flux-journalier with both dates', () => {
      service.getFluxJournalier('2026-01-01', '2026-01-31').subscribe();
      const req = httpMock.expectOne(`${API}/flux-journalier?startDate=2026-01-01&endDate=2026-01-31`);
      expect(req.request.method).toBe('GET');
      req.flush({
        startDate: '2026-01-01',
        endDate: '2026-01-31',
        income: 0,
        expense: 0,
        balance: 0,
        transactions: []
      });
    });
  });

  describe('updateComment', () => {
    it('should PUT the comment to /transactions/:id/comment', () => {
      service.updateComment('tx1', 'commentaire').subscribe();
      const req = httpMock.expectOne(`${API}/transactions/tx1/comment`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual({ comment: 'commentaire' });
      req.flush({});
    });

    // Cas limite : commentaire vide -> envoyé tel quel
    it('should PUT an empty comment (no validation)', () => {
      service.updateComment('tx1', '').subscribe();
      const req = httpMock.expectOne(`${API}/transactions/tx1/comment`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual({ comment: '' });
      req.flush({});
    });
  });

  describe('getTransaction', () => {
    it('should call GET /transactions/:id', () => {
      service.getTransaction('tx1').subscribe();
      const req = httpMock.expectOne(`${API}/transactions/tx1`);
      expect(req.request.method).toBe('GET');
      req.flush(tx);
    });
  });

  describe('updateTransaction', () => {
    it('should PUT the update to /transactions/:id', () => {
      service.updateTransaction('tx1', { amount: 9000 }).subscribe();
      const req = httpMock.expectOne(`${API}/transactions/tx1`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual({ amount: 9000 });
      req.flush({ ...tx, amount: 9000 });
    });
  });

  describe('deleteTransaction', () => {
    it('should DELETE /transactions/:id', () => {
      service.deleteTransaction('tx1').subscribe();
      const req = httpMock.expectOne(`${API}/transactions/tx1`);
      expect(req.request.method).toBe('DELETE');
      req.flush({});
    });
  });

  describe('getTransactionStats', () => {
    it('should call GET /transactions/stats', () => {
      service.getTransactionStats().subscribe();
      const req = httpMock.expectOne(`${API}/transactions/stats`);
      expect(req.request.method).toBe('GET');
      req.flush({ totalIncome: 0, totalExpense: 0 });
    });
  });
});
