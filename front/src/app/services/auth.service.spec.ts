import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { AuthService } from './auth';

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [AuthService, provideHttpClient()]
    });
    service = TestBed.inject(AuthService);
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have login method', () => {
    expect(typeof service.login).toBe('function');
  });

  it('should have logout method', () => {
    expect(typeof service.logout).toBe('function');
  });

  it('should have getUser method', () => {
    expect(typeof service.getUser).toBe('function');
  });

  it('should return null when not logged in', () => {
    expect(service.getUser()).toBeNull();
  });

  it('should return user when logged in', () => {
    const mockUser = { id: '1', username: 'test', role: 'admin', token: 'test-token' };
    localStorage.setItem('user', JSON.stringify(mockUser));
    expect(service.getUser()).toEqual(mockUser);
  });

  it('should clear user on logout', () => {
    localStorage.setItem('user', JSON.stringify({ id: '1', username: 'test' }));
    service.logout();
    expect(service.getUser()).toBeNull();
  });
});
