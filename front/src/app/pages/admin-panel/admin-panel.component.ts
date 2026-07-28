import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AdminService, CompanySettings, PermissionMatrix, FeatureFlag } from '../../services/admin.service';
import { UserService, User } from '../../services/user.service';

@Component({
  selector: 'app-admin-panel',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './admin-panel.component.html',
  styleUrls: ['./admin-panel.component.css']
})
export class AdminPanelComponent implements OnInit {
  activeTab: 'general' | 'users' | 'permissions' | 'features' = 'general';

  // ========== Onglet Général ==========
  company: CompanySettings = {} as CompanySettings;
  saving = false;
  message: { type: 'success' | 'error'; text: string } | null = null;

  // ========== Onglet Utilisateurs ==========
  users: User[] = [];
  usersLoading = true;
  searchQuery = '';
  roleFilter = '';
  showUserModal = false;
  editingUser: User | null = null;
  userForm = { username: '', password: '', fullName: '', email: '', role: 'cashier' };
  roles = [
    { value: 'admin', label: 'Administrateur', icon: '👑' },
    { value: 'cashier', label: 'Caissier', icon: '💵' },
    { value: 'seller', label: 'Commercial', icon: '🤝' },
    { value: 'technician', label: 'Technicien', icon: '🔧' }
  ];

  // ========== Onglet Permissions ==========
  permissions: PermissionMatrix[] = [];
  permissionsLoading = true;

  // ========== Onglet Fonctionnalités ==========
  features: FeatureFlag[] = [];
  featuresLoading = true;

  constructor(
    private adminService: AdminService,
    private userService: UserService
  ) {}

  ngOnInit(): void {
    this.loadAll();
  }

  private loadAll(): void {
    this.loadCompany();
    this.loadUsers();
    this.loadPermissions();
    this.loadFeatures();
  }

  // ------ SOCIÉTÉ ------
  private loadCompany(): void {
    this.adminService.getSettings().subscribe({
      next: (settings) => { this.company = settings.company; },
      error: () => this.showMessage('error', 'Erreur chargement paramètres')
    });
  }

  saveCompany(): void {
    this.saving = true;
    this.adminService.updateCompany(this.company).subscribe({
      next: () => {
        this.showMessage('success', 'Paramètres enregistrés');
        this.saving = false;
      },
      error: () => {
        this.showMessage('error', 'Erreur lors de la sauvegarde');
        this.saving = false;
      }
    });
  }

  // ------ UTILISATEURS ------
  private loadUsers(): void {
    this.usersLoading = true;
    this.userService.getUsers().subscribe({
      next: (data) => { this.users = data; this.usersLoading = false; },
      error: () => { this.users = []; this.usersLoading = false; }
    });
  }

  get filteredUsers(): User[] {
    let result = this.users;
    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      result = result.filter(u =>
        u.username.toLowerCase().includes(q) ||
        u.fullName?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q)
      );
    }
    if (this.roleFilter) {
      result = result.filter(u => u.role === this.roleFilter);
    }
    return result;
  }

  userCounts(role: string): number {
    return this.users.filter(u => u.role === role).length;
  }

  openUserModal(user?: User): void {
    if (user) {
      this.editingUser = user;
      this.userForm = {
        username: user.username,
        password: '',
        fullName: user.fullName || '',
        email: user.email || '',
        role: user.role
      };
    } else {
      this.editingUser = null;
      this.userForm = { username: '', password: '', fullName: '', email: '', role: 'cashier' };
    }
    this.showUserModal = true;
  }

  saveUser(): void {
    if (this.editingUser) {
      const update: any = {};
      if (this.userForm.fullName) update.fullName = this.userForm.fullName;
      if (this.userForm.email) update.email = this.userForm.email;
      if (this.userForm.role) update.role = this.userForm.role;
      if (this.userForm.password) update.password = this.userForm.password;

      this.userService.updateUser(this.editingUser.id, update).subscribe({
        next: () => { this.showUserModal = false; this.loadUsers(); },
        error: (err) => alert(err.error?.error || 'Erreur modification')
      });
    } else {
      this.userService.createUser({
        username: this.userForm.username,
        password: this.userForm.password,
        fullName: this.userForm.fullName,
        email: this.userForm.email,
        role: this.userForm.role
      }).subscribe({
        next: () => { this.showUserModal = false; this.loadUsers(); },
        error: (err) => alert(err.error?.error || 'Erreur création')
      });
    }
  }

  deleteUser(user: User): void {
    if (!confirm(`Supprimer définitivement l'utilisateur "${user.username}" ?`)) return;
    this.userService.deleteUser(user.id).subscribe({
      next: () => this.loadUsers(),
      error: () => alert('Erreur suppression')
    });
  }

  blockUser(user: User): void {
    if (!confirm(`Bloquer l'utilisateur "${user.username}" ?`)) return;
    this.userService.blockUser(user.id).subscribe({
      next: () => this.loadUsers(),
      error: () => alert("Le backend ne supporte pas encore le blocage d'utilisateurs")
    });
  }

  unblockUser(user: User): void {
    this.userService.unblockUser(user.id).subscribe({
      next: () => this.loadUsers(),
      error: () => alert("Le backend ne supporte pas encore le déblocage d'utilisateurs")
    });
  }

  roleLabel(role: string): string {
    const map: Record<string, string> = { admin: '👑 Admin', cashier: '💵 Caissier', seller: '🤝 Commercial', technician: '🔧 Technicien' };
    return map[role] || role;
  }

  // ------ PERMISSIONS ------
  private loadPermissions(): void {
    this.permissionsLoading = true;
    this.adminService.getPermissions().subscribe({
      next: (data) => { this.permissions = data; this.permissionsLoading = false; },
      error: () => { this.permissions = []; this.permissionsLoading = false; }
    });
  }

  togglePermission(roleIdx: number, permIdx: number): void {
    this.permissions[roleIdx].permissions[permIdx].allowed = !this.permissions[roleIdx].permissions[permIdx].allowed;
  }

  hasAnyPermission(roleIdx: number): boolean {
    return this.permissions[roleIdx]?.permissions.some(p => p.allowed) || false;
  }

  savePermissions(): void {
    this.adminService.updatePermissions(this.permissions).subscribe({
      next: () => this.showMessage('success', 'Permissions mises à jour'),
      error: () => this.showMessage('error', 'Erreur sauvegarde permissions')
    });
  }

  resetPermissions(): void {
    if (!confirm('Réinitialiser toutes les permissions par défaut ?')) return;
    this.loadPermissions();
    this.showMessage('success', 'Permissions réinitialisées');
  }

  // ------ FONCTIONNALITÉS ------
  private loadFeatures(): void {
    this.featuresLoading = true;
    this.adminService.getFeatures().subscribe({
      next: (data) => { this.features = data; this.featuresLoading = false; },
      error: () => { this.features = []; this.featuresLoading = false; }
    });
  }

  toggleFeature(feature: FeatureFlag): void {
    const previous = feature.enabled;
    feature.enabled = !feature.enabled;
    this.adminService.updateFeature(feature.key, feature.enabled).subscribe({
      error: () => {
        feature.enabled = previous;
        this.showMessage('error', 'Erreur mise à jour');
      }
    });
  }

  get enabledFeatures(): number {
    return this.features.filter(f => f.enabled).length;
  }

  // ------ MESSAGES ------
  private showMessage(type: 'success' | 'error', text: string): void {
    this.message = { type, text };
    setTimeout(() => this.message = null, 3000);
  }

  trackById(index: number, item: any): string {
    return item?.id ?? index;
  }

  trackByKey(index: number, item: any): string {
    return item?.key ?? index;
  }
}