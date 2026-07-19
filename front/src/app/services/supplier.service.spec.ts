import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { SupplierService } from './supplier';

describe('SupplierService', () => {
  let service: SupplierService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [SupplierService, provideHttpClient()]
    });
    service = TestBed.inject(SupplierService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have getSuppliers method', () => {
    expect(typeof service.getSuppliers).toBe('function');
  });

  it('should have createSupplier method', () => {
    expect(typeof service.createSupplier).toBe('function');
  });

  it('should have updateSupplier method', () => {
    expect(typeof service.updateSupplier).toBe('function');
  });

  it('should have deleteSupplier method', () => {
    expect(typeof service.deleteSupplier).toBe('function');
  });
});
