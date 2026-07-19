import { ComponentFixture, TestBed } from '@angular/core/testing';
import { UserManagementComponent } from './user-management.component';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { provideHttpClient } from '@angular/common/http';
import { UserService } from '../../services/user.service';
import { AuthService } from '../../services/auth';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('UserManagementComponent', () => {
  let component: UserManagementComponent;
  let fixture: ComponentFixture<UserManagementComponent>;
  let mockUserService: jasmine.SpyObj<UserService>;
  let mockAuthService: jasmine.SpyObj<AuthService>;
  let mockActivatedRoute: jasmine.SpyObj<ActivatedRoute>;

  const mockUsers = [
    { id: '1', username: 'admin', fullName: 'Admin User', email: 'admin@test.com', role: 'admin' },
    { id: '2', username: 'cashier', fullName: 'Cashier User', email: 'cashier@test.com', role: 'cashier' }
  ];

  beforeEach(async () => {
    mockUserService = jasmine.createSpyObj('UserService', ['getUsers']);
    mockUserService.getUsers.and.returnValue(of(mockUsers));
    mockAuthService = jasmine.createSpyObj('AuthService', ['logout', 'getUser']);
    mockAuthService.getUser.and.returnValue({ username: 'admin', role: 'admin' });
    mockActivatedRoute = jasmine.createSpyObj('ActivatedRoute', ['data']);
    mockActivatedRoute.data.and.returnValue(of({ data: { users: mockUsers } }));

    await TestBed.configureTestingModule({
      imports: [UserManagementComponent, CommonModule, FormsModule],
      providers: [
        { provide: UserService, useValue: mockUserService },
        { provide: AuthService, useValue: mockAuthService },
        { provide: ActivatedRoute, useValue: mockActivatedRoute }
      ]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(UserManagementComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load users from resolver', () => {
    expect(component.users.length).toBe(2);
    expect(component.users[0].username).toBe('admin');
  });

  it('should have correct total users', () => {
    expect(component.totalUsers).toBe(2);
  });

  it('should filter users by search query', () => {
    component.searchQuery = 'admin';
    expect(component.filteredUsers.length).toBe(1);
    expect(component.filteredUsers[0].username).toBe('admin');
  });

  it('should filter users by role', () => {
    component.roleFilter = 'admin';
    expect(component.filteredUsers.length).toBe(1);
    expect(component.filteredUsers[0].role).toBe('admin');
  });

  it('should open add modal', () => {
    component.openModal();
    expect(component.showModal).toBeTrue();
    expect(component.isEditing).toBeFalse();
  });

  it('should open edit modal', () => {
    component.openEditModal(mockUsers[0]);
    expect(component.showModal).toBeTrue();
    expect(component.isEditing).toBeTrue();
    expect(component.editingUser).toBe(mockUsers[0]);
  });

  it('should logout', () => {
    component.logout();
    expect(mockAuthService.logout).toHaveBeenCalled();
  });

  it('should return correct role labels', () => {
    expect(component.getRoleLabel('admin')).toBe('Administrateur');
    expect(component.getRoleLabel('cashier')).toBe('Caissier');
    expect(component.getRoleLabel('technician')).toBe('Technicien');
  });
});
