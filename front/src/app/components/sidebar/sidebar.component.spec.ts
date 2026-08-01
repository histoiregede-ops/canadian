import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SidebarComponent } from './sidebar.component';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { vi } from 'vitest';

describe('SidebarComponent', () => {
  let component: SidebarComponent;
  let fixture: ComponentFixture<SidebarComponent>;
  let mockAuthService: { getUser: ReturnType<typeof vi.fn>; logout: ReturnType<typeof vi.fn> };
  let mockRouter: { navigate: ReturnType<typeof vi.fn>; events: any };

  beforeEach(async () => {
    mockAuthService = { getUser: vi.fn(), logout: vi.fn() };
    mockAuthService.getUser.mockReturnValue({ username: 'test', role: 'admin', fullName: 'Test User' });
    mockRouter = { navigate: vi.fn(), events: of() };

    await TestBed.configureTestingModule({
      imports: [SidebarComponent, CommonModule],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: Router, useValue: mockRouter }
      ]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(SidebarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load user on init', () => {
    expect(component.user).toEqual({ username: 'test', role: 'admin', fullName: 'Test User' });
  });

  it('should have logout method', () => {
    expect(typeof component.logout).toBe('function');
  });

  it('should call authService.logout on logout', () => {
    component.logout();
    expect(mockAuthService.logout).toHaveBeenCalled();
  });

  it('should display user name', () => {
    const compiled = fixture.nativeElement;
    expect(compiled.querySelector('.name')?.textContent).toContain('Test User');
  });
});
