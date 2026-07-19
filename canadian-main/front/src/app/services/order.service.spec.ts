import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { OrderService } from './order';

describe('OrderService', () => {
  let service: OrderService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [OrderService, provideHttpClient()]
    });
    service = TestBed.inject(OrderService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have getOrders method', () => {
    expect(typeof service.getOrders).toBe('function');
  });

  it('should have createOrder method', () => {
    expect(typeof service.createOrder).toBe('function');
  });

  it('should have getOrder method', () => {
    expect(typeof service.getOrder).toBe('function');
  });

  it('should have getCustomerOrders method', () => {
    expect(typeof service.getCustomerOrders).toBe('function');
  });
});
