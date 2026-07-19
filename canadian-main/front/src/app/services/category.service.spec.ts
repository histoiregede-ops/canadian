import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { CategoryService } from './category';

describe('CategoryService', () => {
  let service: CategoryService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [CategoryService, provideHttpClient()]
    });
    service = TestBed.inject(CategoryService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have getCategories method', () => {
    expect(typeof service.getCategories).toBe('function');
  });

  it('should have createCategory method', () => {
    expect(typeof service.createCategory).toBe('function');
  });

  it('should have updateCategory method', () => {
    expect(typeof service.updateCategory).toBe('function');
  });

  it('should have deleteCategory method', () => {
    expect(typeof service.deleteCategory).toBe('function');
  });
});
