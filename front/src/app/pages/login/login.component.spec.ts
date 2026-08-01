import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LoginComponent } from './login.component';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
  let mockAuthService: {
    login: ReturnType<typeof vi.fn>;
    isLoggedIn: ReturnType<typeof vi.fn>;
    getUser: ReturnType<typeof vi.fn>;
  };
  let mockRouter: { navigate: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    mockAuthService = { login: vi.fn(), isLoggedIn: vi.fn(), getUser: vi.fn() };
    mockAuthService.login.mockReturnValue(of({}));
    mockAuthService.isLoggedIn.mockReturnValue(false);
    mockAuthService.getUser.mockReturnValue({ role: 'admin' });
    mockRouter = { navigate: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [LoginComponent, CommonModule, FormsModule],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
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

  it('should call authService.login on staff login', () => {
    component.username = 'admin';
    component.password = 'admin123';
    component.onSubmit({ preventDefault: () => {} } as Event);
    expect(mockAuthService.login).toHaveBeenCalledWith({ username: 'admin', password: 'admin123' });
  });

  it('should navigate to dashboard on successful login', () => {
    component.username = 'admin';
    component.password = 'admin123';
    component.onSubmit({ preventDefault: () => {} } as Event);
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/dashboard']);
  });

  it('should navigate to /sales for a cashier role', () => {
    mockAuthService.getUser.mockReturnValue({ role: 'cashier' });
    component.username = 'caissier';
    component.password = 'x';
    component.onSubmit({ preventDefault: () => {} } as Event);
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/sales']);
  });

  it('should show error on invalid credentials', () => {
    mockAuthService.login.mockReturnValue(throwError(() => new Error('Invalid')));
    component.username = 'admin';
    component.password = 'wrong';
    component.onSubmit({ preventDefault: () => {} } as Event);
    expect(component.errorMessage).toContain('invalides');
  });

  // Cas limite : champs vides -> la requête est tout de même envoyée
  it('should still call login with empty credentials (no client-side validation)', () => {
    component.username = '';
    component.password = '';
    component.onSubmit({ preventDefault: () => {} } as Event);
    expect(mockAuthService.login).toHaveBeenCalledWith({ username: '', password: '' });
  });
});
