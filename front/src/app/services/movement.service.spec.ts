import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { MovementService } from './movement';

describe('MovementService', () => {
  let service: MovementService;
  let httpMock: HttpTestingController;

  const API = 'http://localhost:3000/api/movements';

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [MovementService, provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(MovementService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getMovements', () => {
    it('should call GET with no params when no filters are provided', () => {
      service.getMovements().subscribe();
      const req = httpMock.expectOne(`${API}`);
      expect(req.request.method).toBe('GET');
      req.flush({ movements: [], total: 0, page: 1, pages: 1 });
    });

    // Cas limite : filtres vides / null / undefined ignorés
    it('should omit empty, null and undefined filters from the query string', () => {
      service
        .getMovements({
          productId: 'p1',
          reason: '',
          startDate: undefined as any,
          endDate: null as any,
          page: 2,
          limit: 10
        })
        .subscribe();
      const req = httpMock.expectOne(`${API}?productId=p1&page=2&limit=10`);
      expect(req.request.method).toBe('GET');
      req.flush({ movements: [], total: 0, page: 2, pages: 1 });
    });

    it('should include all provided filters', () => {
      service
        .getMovements({ productId: 'p1', reason: 'restock', startDate: '2026-01-01', endDate: '2026-01-31' })
        .subscribe();
      const req = httpMock.expectOne(`${API}?productId=p1&reason=restock&startDate=2026-01-01&endDate=2026-01-31`);
      req.flush({ movements: [], total: 0, page: 1, pages: 1 });
    });

    it('should propagate HTTP errors', () => {
      let error: any;
      service.getMovements().subscribe({ error: (e) => (error = e) });
      const req = httpMock.expectOne(`${API}`);
      req.flush('Bad Request', { status: 400, statusText: 'Bad Request' });
      expect(error.status).toBe(400);
    });
  });

  describe('getMovement', () => {
    it('should call GET /:id', () => {
      service.getMovement(42).subscribe();
      const req = httpMock.expectOne(`${API}/42`);
      expect(req.request.method).toBe('GET');
      req.flush({
        id: 42,
        productId: 'p1',
        previousQuantity: 0,
        newQuantity: 5,
        changeAmount: 5,
        reason: 'restock',
        reference: null,
        createdBy: null,
        createdAt: '2026-01-01T10:00:00.000Z'
      });
    });

    // Cas limite : id négatif -> l'URL est construite telle quelle
    it('should build the URL with a negative id (no validation)', () => {
      service.getMovement(-1).subscribe();
      const req = httpMock.expectOne(`${API}/-1`);
      expect(req.request.method).toBe('GET');
      req.flush({ id: -1 });
    });
  });

  describe('getMovementsByProduct', () => {
    it('should default to page=1 and limit=50', () => {
      service.getMovementsByProduct('p1').subscribe();
      const req = httpMock.expectOne(`${API}/product/p1?page=1&limit=50`);
      expect(req.request.method).toBe('GET');
      req.flush({ movements: [], total: 0, page: 1, pages: 1 });
    });

    it('should use the provided page and limit', () => {
      service.getMovementsByProduct('p1', 3, 25).subscribe();
      const req = httpMock.expectOne(`${API}/product/p1?page=3&limit=25`);
      expect(req.request.method).toBe('GET');
      req.flush({ movements: [], total: 0, page: 3, pages: 1 });
    });
  });

  describe('getMovementsSummary', () => {
    it('should call GET /summary without filters', () => {
      service.getMovementsSummary().subscribe();
      const req = httpMock.expectOne(`${API}/summary`);
      expect(req.request.method).toBe('GET');
      req.flush({ total: 0, byReason: [], byProduct: [], dateRange: { start: '', end: '' } });
    });

    it('should forward the filters as params', () => {
      service.getMovementsSummary({ productId: 'p1' }).subscribe();
      const req = httpMock.expectOne(`${API}/summary?productId=p1`);
      expect(req.request.method).toBe('GET');
      req.flush({ total: 0, byReason: [], byProduct: [], dateRange: { start: '', end: '' } });
    });
  });

  describe('getReasons', () => {
    it('should call GET /reasons', () => {
      service.getReasons().subscribe();
      const req = httpMock.expectOne(`${API}/reasons`);
      expect(req.request.method).toBe('GET');
      req.flush(['restock', 'sale', 'adjustment']);
    });
  });
});
