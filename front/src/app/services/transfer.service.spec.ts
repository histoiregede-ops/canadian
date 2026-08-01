import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TransferService, Transfer } from './transfer';

describe('TransferService', () => {
  let service: TransferService;
  let httpMock: HttpTestingController;

  const API = 'http://localhost:3000/api/transfers';

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [TransferService, provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(TransferService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getTransfers', () => {
    it('should call GET with default page and limit when filters are empty', () => {
      service.getTransfers({}).subscribe();
      const req = httpMock.expectOne(`${API}?page=1&limit=20`);
      expect(req.request.method).toBe('GET');
      req.flush({ data: [], total: 0, page: 1, pages: 1 });
    });

    it('should build query params with all provided filters', () => {
      service
        .getTransfers({
          page: 2,
          limit: 50,
          operator: 'wave',
          type: 'sent',
          status: 'pending',
          agentId: 'agent-1',
          from: '2026-01-01',
          to: '2026-01-31'
        })
        .subscribe();
      const req = httpMock.expectOne(
        `${API}?page=2&limit=50&operator=wave&type=sent&status=pending&agentId=agent-1&from=2026-01-01&to=2026-01-31`
      );
      expect(req.request.method).toBe('GET');
      req.flush({ data: [], total: 0, page: 2, pages: 1 });
    });

    // Cas limite : page=0 -> retombe sur la valeur par défaut 1
    it('should default page=0 to 1', () => {
      service.getTransfers({ page: 0 }).subscribe();
      const req = httpMock.expectOne(`${API}?page=1&limit=20`);
      req.flush({ data: [], total: 0, page: 1, pages: 1 });
    });

    // Cas limite : limit=0 -> retombe sur la valeur par défaut 20
    it('should default limit=0 to 20', () => {
      service.getTransfers({ limit: 0 }).subscribe();
      const req = httpMock.expectOne(`${API}?page=1&limit=20`);
      req.flush({ data: [], total: 0, page: 1, pages: 1 });
    });

    it('should propagate HTTP errors to the subscriber', () => {
      let error: any;
      service.getTransfers({}).subscribe({ error: (e) => (error = e) });
      const req = httpMock.expectOne(`${API}?page=1&limit=20`);
      req.flush('Server Error', { status: 500, statusText: 'Internal Server Error' });
      expect(error.status).toBe(500);
    });
  });

  describe('getDailySummary', () => {
    it('should call the summary endpoint without agentId', () => {
      service.getDailySummary().subscribe();
      const req = httpMock.expectOne(`${API}/summary/daily`);
      expect(req.request.method).toBe('GET');
      req.flush({ totalSent: 0, totalReceived: 0, totalFees: 0, count: 0, byOperator: {} });
    });

    it('should include the agentId query param when provided', () => {
      service.getDailySummary('agent-1').subscribe();
      const req = httpMock.expectOne(`${API}/summary/daily?agentId=agent-1`);
      expect(req.request.method).toBe('GET');
      req.flush({ totalSent: 0, totalReceived: 0, totalFees: 0, count: 0, byOperator: {} });
    });
  });

  describe('createTransfer', () => {
    it('should POST the payload to the apiUrl', () => {
      const payload: Partial<Transfer> = { operator: 'wave', type: 'sent', amount: 5000 };
      service.createTransfer(payload).subscribe();
      const req = httpMock.expectOne(API);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(payload);
      req.flush({ id: 'T1', ...payload, status: 'pending' });
    });

    // Cas limite : payload vide -> le service ne valide pas, il envoie tel quel
    it('should POST an empty payload as-is (no validation)', () => {
      service.createTransfer({}).subscribe();
      const req = httpMock.expectOne(API);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({});
      req.flush({ id: 'T1', status: 'pending' });
    });

    it('should propagate HTTP errors', () => {
      let error: any;
      service.createTransfer({ amount: 1 }).subscribe({ error: (e) => (error = e) });
      const req = httpMock.expectOne(API);
      req.flush('Bad Request', { status: 400, statusText: 'Bad Request' });
      expect(error.status).toBe(400);
    });
  });

  describe('confirmTransfer / failTransfer', () => {
    it('confirmTransfer should POST to /:id/confirm', () => {
      service.confirmTransfer('T1').subscribe();
      const req = httpMock.expectOne(`${API}/T1/confirm`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({});
      req.flush({ id: 'T1', status: 'completed' });
    });

    it('failTransfer should POST to /:id/fail', () => {
      service.failTransfer('T1').subscribe();
      const req = httpMock.expectOne(`${API}/T1/fail`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({});
      req.flush({ id: 'T1', status: 'failed' });
    });
  });

  describe('updateTransfer / deleteTransfer', () => {
    it('updateTransfer should PUT to /:id', () => {
      service.updateTransfer('T1', { note: 'updated' }).subscribe();
      const req = httpMock.expectOne(`${API}/T1`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual({ note: 'updated' });
      req.flush({ id: 'T1', note: 'updated' });
    });

    it('deleteTransfer should DELETE to /:id', () => {
      service.deleteTransfer('T1').subscribe();
      const req = httpMock.expectOne(`${API}/T1`);
      expect(req.request.method).toBe('DELETE');
      req.flush({});
    });
  });
});
