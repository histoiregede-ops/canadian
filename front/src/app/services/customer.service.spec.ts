import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { CustomerService } from './customer';

describe('CustomerService', () => {
  let service: CustomerService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [CustomerService, provideHttpClient()]
    });
    service = TestBed.inject(CustomerService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have getCustomers method', () => {
    expect(typeof service.getCustomers).toBe('function');
  });

  it('should have createCustomer method', () => {
    expect(typeof service.createCustomer).toBe('function');
  });

  it('should have updateCustomer method', () => {
    expect(typeof service.updateCustomer).toBe('function');
  });

  it('should have deleteCustomer method', () => {
    expect(typeof service.deleteCustomer).toBe('function');
  });

  it('should have getCustomerLoyalty method', () => {
    expect(typeof service.getCustomerLoyalty).toBe('function');
  });
});
