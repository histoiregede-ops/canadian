import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LoginComponent } from './login.component';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { provideHttpClient } from '@angular/common/http';
import { AuthService } from '../services/auth';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
  let mockAuthService: jasmine.SpyObj<AuthService>;
  let mockRouter: jasmine.SpyObj<Router>;

  beforeEach(async () => {
    mockAuthService = jasmine.createSpyObj('AuthService', ['login', 'isLoggedIn', 'getUser']);
    mockAuthService.login.and.returnValue(of({}));
    mockAuthService.isLoggedIn.and.returnValue(false);
    mockAuthService.getUser.and.returnValue({ role: 'admin' });
    mockRouter = jasmine.createSpyObj('Router', ['navigate']);

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

  it('should show error on invalid credentials', () => {
    mockAuthService.login.and.returnValue(throwError(() => new Error('Invalid')));
    component.username = 'admin';
    component.password = 'wrong';
    component.onSubmit({ preventDefault: () => {} } as Event);
    expect(component.errorMessage).toContain('invalides');
  });
});
