import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LoginComponent } from './login.component';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { provideHttpClient } from '@angular/common/http';
import { AuthService } from '../services/auth';
import { CustomerAuthService } from '../services/customer-auth';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
  let mockAuthService: jasmine.SpyObj<AuthService>;
  let mockCustomerAuth: jasmine.SpyObj<CustomerAuthService>;
  let mockRouter: jasmine.SpyObj<Router>;

  beforeEach(async () => {
    mockAuthService = jasmine.createSpyObj('AuthService', ['login']);
    mockAuthService.login.and.returnValue(of({}));
    mockCustomerAuth = jasmine.createSpyObj('CustomerAuthService', ['login', 'register']);
    mockCustomerAuth.login.and.returnValue(of({}));
    mockRouter = jasmine.createSpyObj('Router', ['navigate']);

    await TestBed.configureTestingModule({
      imports: [LoginComponent, CommonModule, FormsModule],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: CustomerAuthService, useValue: mockCustomerAuth },
        { provide: Router, useValue: mockRouter }
      ]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have default staff mode', () => {
    expect(component.loginMode).toBe('staff');
  });

  it('should toggle to customer mode', () => {
    component.toggleMode('customer');
    expect(component.loginMode).toBe('customer');
  });

  it('should call authService.login on staff login', () => {
    component.username = 'admin';
    component.password = 'admin123';
    component.onSubmit();
    expect(mockAuthService.login).toHaveBeenCalledWith({ username: 'admin', password: 'admin123' });
  });

  it('should show error on invalid credentials', () => {
    mockAuthService.login.and.returnValue(throwError(() => new Error('Invalid')));
    component.username = 'admin';
    component.password = 'wrong';
    component.onSubmit();
    expect(component.errorMessage).toContain('invalides');
  });

  it('should switch to register mode', () => {
    component.toggleRegister();
    expect(component.isRegisterMode).toBeTrue();
  });
});
