import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { AdminService, CompanySettings, PermissionMatrix, FeatureFlag } from '../../services/admin.service';
import { UserService, User } from '../../services/user.service';
import { ToastService } from '../../services/toast.service';

@Component({
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
    private userService: UserService,
    private toastService: ToastService
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
      error: () => this.toastService.show('Erreur chargement paramètres', 'error')
    });
  }

  saveCompany(event?: Event): void {
    event?.preventDefault();
    this.saving = true;
    this.adminService.updateCompany(this.company)
      .pipe(finalize(() => { this.saving = false; }))
      .subscribe({
        next: () => {
          this.toastService.show('Paramètres enregistrés', 'success');
        },
        error: () => {
          this.toastService.show('Erreur lors de la sauvegarde', 'error');
        }
      });
  }

  // ------ UTILISATEURS ------
  private loadUsers(callback?: () => void): void {
    this.usersLoading = true;
    this.userService.getUsers().subscribe({
      next: (data) => { this.users = data; this.usersLoading = false; callback?.(); },
      error: () => { this.users = []; this.usersLoading = false; callback?.(); }
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

  saveUser(event?: Event): void {
    event?.preventDefault();
    if (this.editingUser) {
      const update: any = {};
      if (this.userForm.fullName) update.fullName = this.userForm.fullName;
      if (this.userForm.email) update.email = this.userForm.email;
      if (this.userForm.role) update.role = this.userForm.role;
      if (this.userForm.password) update.password = this.userForm.password;

      this.userService.updateUser(this.editingUser.id, update).subscribe({
        next: () => {
          this.loadUsers(() => {
            this.showUserModal = false;
            this.toastService.show('Utilisateur mis à jour', 'success');
          });
        },
        error: (err) => this.toastService.show(err.error?.error || 'Erreur modification', 'error')
      });
    } else {
      this.userService.createUser({
        username: this.userForm.username,
        password: this.userForm.password,
        fullName: this.userForm.fullName,
        email: this.userForm.email,
        role: this.userForm.role
      }).subscribe({
        next: () => {
          this.loadUsers(() => {
            this.showUserModal = false;
            this.toastService.show('Utilisateur créé', 'success');
          });
        },
        error: (err) => this.toastService.show(err.error?.error || 'Erreur création', 'error')
      });
    }
  }

  deleteUser(user: User): void {
    if (!confirm(`Supprimer définitivement l'utilisateur "${user.username}" ?`)) return;
    this.userService.deleteUser(user.id).subscribe({
      next: () => {
        this.loadUsers(() => {
          this.toastService.show('Utilisateur supprimé', 'success');
        });
      },
      error: () => this.toastService.show('Erreur suppression', 'error')
    });
  }

  blockUser(user: User): void {
    if (!confirm(`Bloquer l'utilisateur "${user.username}" ?`)) return;
    this.userService.blockUser(user.id).subscribe({
      next: () => {
        this.loadUsers(() => {
          this.toastService.show('Utilisateur bloqué', 'success');
        });
      },
      error: () => this.toastService.show("Le backend ne supporte pas encore le blocage d'utilisateurs", 'error')
    });
  }

  unblockUser(user: User): void {
    this.userService.unblockUser(user.id).subscribe({
      next: () => {
        this.loadUsers(() => {
          this.toastService.show('Utilisateur débloqué', 'success');
        });
      },
      error: () => this.toastService.show("Le backend ne supporte pas encore le déblocage d'utilisateurs", 'error')
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
      next: () => this.toastService.show('Permissions mises à jour', 'success'),
      error: () => this.toastService.show('Erreur sauvegarde permissions', 'error')
    });
  }

  resetPermissions(): void {
    if (!confirm('Réinitialiser toutes les permissions par défaut ?')) return;
    this.loadPermissions();
    this.toastService.show('Permissions réinitialisées', 'success');
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
        this.toastService.show('Erreur mise à jour', 'error');
      }
    });
  }

  get enabledFeatures(): number {
    return this.features.filter(f => f.enabled).length;
  }

  // ------ MESSAGES ------
  trackById(index: number, item: any): string {
    return item?.id ?? index;
  }

  trackByKey(index: number, item: any): string {
    return item?.key ?? index;
  }
}