import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { ProductService } from './product';
import { of } from 'rxjs';

describe('ProductService', () => {
  let service: ProductService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ProductService, provideHttpClient()]
    });
    service = TestBed.inject(ProductService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have getProducts method', () => {
    expect(typeof service.getProducts).toBe('function');
  });

  it('should have getProduct method', () => {
    expect(typeof service.getProduct).toBe('function');
  });

  it('should have createProduct method', () => {
    expect(typeof service.createProduct).toBe('function');
  });

  it('should have updateProduct method', () => {
    expect(typeof service.updateProduct).toBe('function');
  });

  it('should have deleteProduct method', () => {
    expect(typeof service.deleteProduct).toBe('function');
  });
});
