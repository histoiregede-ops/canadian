import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ShopComponent } from './shop.component';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { provideHttpClient } from '@angular/common/http';
import { ProductService } from '../../services/product';
import { CategoryService } from '../../services/category';
import { CartService } from '../../services/cart';
import { CustomerAuthService } from '../../services/customer-auth';
import { Router } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('ShopComponent', () => {
  let component: ShopComponent;
  let fixture: ComponentFixture<ShopComponent>;
  let mockProductService: jasmine.SpyObj<ProductService>;
  let mockCategoryService: jasmine.SpyObj<CategoryService>;
  let mockCartService: jasmine.SpyObj<CartService>;
  let mockCustomerAuth: jasmine.SpyObj<CustomerAuthService>;
  let mockRouter: jasmine.SpyObj<Router>;
  let mockActivatedRoute: jasmine.SpyObj<ActivatedRoute>;

  const mockProducts = [
    { id: '1', name: 'Product 1', price: 1000, stockQuantity: 10, status: 'available', categoryId: 'cat1' },
    { id: '2', name: 'Product 2', price: 2000, stockQuantity: 5, status: 'available', categoryId: 'cat1' }
  ];

  const mockCategories = [
    { id: 'cat1', name: 'Solar', type: 'solar' },
    { id: 'cat2', name: 'Electronics', type: 'electronics' }
  ];

  beforeEach(async () => {
    mockProductService = jasmine.createSpyObj('ProductService', ['getProducts']);
    mockProductService.getProducts.and.returnValue(of(mockProducts));
    mockCategoryService = jasmine.createSpyObj('CategoryService', ['getCategories']);
    mockCategoryService.getCategories.and.returnValue(of(mockCategories));
    mockCartService = jasmine.createSpyObj('CartService', ['addItem']);
    mockCustomerAuth = jasmine.createSpyObj('CustomerAuthService', ['isLoggedIn', 'logout']);
    mockCustomerAuth.isLoggedIn.and.returnValue(false);
    mockRouter = jasmine.createSpyObj('Router', ['navigate']);
    mockActivatedRoute = jasmine.createSpyObj('ActivatedRoute', ['data']);
    mockActivatedRoute.data.and.returnValue(of({ data: { products: mockProducts, categories: mockCategories } }));

    await TestBed.configureTestingModule({
      imports: [ShopComponent, CommonModule, FormsModule],
      providers: [
        { provide: ProductService, useValue: mockProductService },
        { provide: CategoryService, useValue: mockCategoryService },
        { provide: CartService, useValue: mockCartService },
        { provide: CustomerAuthService, useValue: mockCustomerAuth },
        { provide: Router, useValue: mockRouter },
        { provide: ActivatedRoute, useValue: mockActivatedRoute }
      ]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ShopComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
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
    expect(component.products.every(p => p.status === 'available')).toBeTrue();
  });

  it('should set featured products', () => {
    expect(component.featuredProducts.length).toBeGreaterThan(0);
  });
});
