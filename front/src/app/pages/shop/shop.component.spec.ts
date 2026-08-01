import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ShopComponent } from './shop.component';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { provideHttpClient } from '@angular/common/http';
import { ProductService } from '../../services/product';
import { CategoryService } from '../../services/category';
import { CartService } from '../../services/cart';
import { CustomerAuthService } from '../../services/customer-auth';
import { ProductReviewService } from '../../services/product-review';
import { RefreshService } from '../../services/refresh.service';
import { Router, ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { vi } from 'vitest';

describe('ShopComponent', () => {
  let component: ShopComponent;
  let fixture: ComponentFixture<ShopComponent>;
  let mockProductService: { getProducts: ReturnType<typeof vi.fn> };
  let mockCategoryService: { getCategories: ReturnType<typeof vi.fn> };
  let mockCartService: { addItem: ReturnType<typeof vi.fn> };
  let mockCustomerAuth: { isAuthenticated: ReturnType<typeof vi.fn>; logout: ReturnType<typeof vi.fn> };
  let mockRouter: { navigate: ReturnType<typeof vi.fn> };
  let mockActivatedRoute: { data: any };
  let mockReviewService: { getBatchReviews: ReturnType<typeof vi.fn>; getStarArray: ReturnType<typeof vi.fn>; formatRating: ReturnType<typeof vi.fn> };
  let mockRefreshService: { refresh$: any };

  const mockProducts = [
    { id: '1', name: 'Product 1', price: 1000, stockQuantity: 10, status: 'available', categoryId: 'cat1' },
    { id: '2', name: 'Product 2', price: 2000, stockQuantity: 5, status: 'available', categoryId: 'cat1' }
  ];

  const mockCategories = [
    { id: 'cat1', name: 'Solar', type: 'solar' },
    { id: 'cat2', name: 'Electronics', type: 'electronics' }
  ];

  beforeEach(async () => {
    mockProductService = { getProducts: vi.fn().mockReturnValue(of(mockProducts)) };
    mockCategoryService = { getCategories: vi.fn().mockReturnValue(of(mockCategories)) };
    mockCartService = { addItem: vi.fn() };
    mockCustomerAuth = { isAuthenticated: vi.fn().mockReturnValue(false), logout: vi.fn() };
    mockRouter = { navigate: vi.fn() };
    mockActivatedRoute = { data: of({ data: { products: mockProducts, categories: mockCategories } }) };
    mockReviewService = {
      getBatchReviews: vi.fn().mockReturnValue(of({})),
      getStarArray: vi.fn().mockReturnValue([true, true, true, false, false]),
      formatRating: vi.fn().mockReturnValue('4.0')
    };
    mockRefreshService = { refresh$: of() };

    await TestBed.configureTestingModule({
      imports: [ShopComponent, CommonModule, FormsModule],
      providers: [
        { provide: ProductService, useValue: mockProductService },
        { provide: CategoryService, useValue: mockCategoryService },
        { provide: CartService, useValue: mockCartService },
        { provide: CustomerAuthService, useValue: mockCustomerAuth },
        { provide: ProductReviewService, useValue: mockReviewService },
        { provide: RefreshService, useValue: mockRefreshService },
        { provide: Router, useValue: mockRouter },
        { provide: ActivatedRoute, useValue: mockActivatedRoute },
        provideHttpClient()
      ]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ShopComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.destroy();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load products from resolver', () => {
    expect(component.products.length).toBe(2);
  });

  it('should load categories from resolver', () => {
    expect(component.categories.length).toBe(2);
  });

  it('should have addToCart method', () => {
    expect(typeof component.addToCart).toBe('function');
  });

  it('should call cartService.addItem on addToCart', () => {
    component.addToCart(mockProducts[0]);
    expect(mockCartService.addItem).toHaveBeenCalledWith(mockProducts[0], 1);
  });

  it('should filter available products only', () => {
    expect(component.products.every((p) => p.status === 'available')).toBe(true);
  });

  it('should set featured products', () => {
    expect(component.featuredProducts.length).toBeGreaterThan(0);
  });

  it('should apply price sort from low to high', () => {
    component.sortBy = 'price-low';
    component.applySorting();
    expect(component.products[0].price).toBeLessThanOrEqual(component.products[1].price);
  });
});
