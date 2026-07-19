import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { StatsService } from './stats';

describe('StatsService', () => {
  let service: StatsService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [StatsService, provideHttpClient()]
    });
    service = TestBed.inject(StatsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have getDashboardStats method', () => {
    expect(typeof service.getDashboardStats).toBe('function');
  });

  it('should have getRecentOrders method', () => {
    expect(typeof service.getRecentOrders).toBe('function');
  });

  it('should have getUrgentRepairs method', () => {
    expect(typeof service.getUrgentRepairs).toBe('function');
  });
});
