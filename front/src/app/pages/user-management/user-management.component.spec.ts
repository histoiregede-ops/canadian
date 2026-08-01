import { ComponentFixture, TestBed } from '@angular/core/testing';
import { UserManagementComponent } from './user-management.component';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserService } from '../../services/user.service';
import { AuthService } from '../../services/auth';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { vi } from 'vitest';

describe('UserManagementComponent', () => {
  let component: UserManagementComponent;
  let fixture: ComponentFixture<UserManagementComponent>;
  let mockUserService: { getUsers: ReturnType<typeof vi.fn>; createUser: ReturnType<typeof vi.fn>; updateUser: ReturnType<typeof vi.fn> };
  let mockAuthService: { logout: ReturnType<typeof vi.fn>; getUser: ReturnType<typeof vi.fn> };
  let mockActivatedRoute: { data: any };

  const mockUsers = [
    { id: '1', username: 'admin', fullName: 'Admin User', email: 'admin@test.com', role: 'admin' },
    { id: '2', username: 'cashier', fullName: 'Cashier User', email: 'cashier@test.com', role: 'cashier' }
  ];

  beforeEach(async () => {
    mockUserService = {
      getUsers: vi.fn().mockReturnValue(of(mockUsers)),
      createUser: vi.fn().mockReturnValue(of({})),
      updateUser: vi.fn().mockReturnValue(of({}))
    };
    mockAuthService = { logout: vi.fn(), getUser: vi.fn().mockReturnValue({ username: 'admin', role: 'admin' }) };
    mockActivatedRoute = { data: of({ data: { users: mockUsers } }) };

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

  afterEach(() => {
    fixture.destroy();
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
    expect(component.showModal).toBe(true);
    expect(component.editingUser).toBeNull();
  });

  it('should open edit modal', () => {
    component.editUser(mockUsers[0]);
    expect(component.showModal).toBe(true);
    expect(component.editingUser).toBe(mockUsers[0]);
    expect(component.form.username).toBe('admin');
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

  it('should save a new user when the username is filled', () => {
    component.form.username = 'newuser';
    component.form.password = 'pw';
    component.save();
    expect(mockUserService.createUser).toHaveBeenCalled();
  });

  it('should not save when the username is empty', () => {
    component.form.username = '';
    component.save();
    expect(mockUserService.createUser).not.toHaveBeenCalled();
    expect(mockUserService.updateUser).not.toHaveBeenCalled();
  });
});
