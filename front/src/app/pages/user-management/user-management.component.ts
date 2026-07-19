import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { UserService, User } from '../../services/user.service';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './user-management.component.html',
  styleUrls: ['./user-management.component.css']
})
export class UserManagementComponent implements OnInit {
  users: User[] = [];
  loading = true;
  showModal = false;
  editingUser: User | null = null;
  form = { username: '', password: '', fullName: '', email: '', role: 'cashier' };
  roles = ['admin', 'seller', 'cashier', 'technician', 'delivery'];
  searchQuery = '';
  roleFilter = '';

  constructor(
    private route: ActivatedRoute,
    private userService: UserService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.route.data.subscribe(({ data }) => {
      if (data) {
        this.users = data.users || [];
        this.loading = false;
      }
    });
    setTimeout(() => {
      if (this.loading) this.loading = false;
    }, 3000);
  }

  get filteredUsers(): User[] {
    let result = this.users;
    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      result = result.filter(u =>
        u.username.toLowerCase().includes(q) ||
        u.fullName.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q)
      );
    }
    if (this.roleFilter) {
      result = result.filter(u => u.role === this.roleFilter);
    }
    return result;
  }

  get totalUsers(): number { return this.users.length; }
  get adminCount(): number { return this.users.filter(u => u.role === 'admin').length; }
  get techCount(): number { return this.users.filter(u => u.role === 'technician').length; }
  get otherCount(): number { return this.users.filter(u => !['admin','technician'].includes(u.role)).length; }

  logout(): void {
    this.authService.logout();
  }

  loadUsers(): void {
    this.loading = true;
    this.userService.getUsers().subscribe({
      next: (users) => { this.users = users; this.loading = false; },
      error: () => { this.loading = false; }
    });
  }

  openModal(): void {
    this.editingUser = null;
    this.form = { username: '', password: '', fullName: '', email: '', role: 'cashier' };
    this.showModal = true;
  }

  editUser(user: User): void {
    this.editingUser = user;
    this.form = {
      username: user.username,
      password: '',
      fullName: user.fullName || '',
      email: user.email || '',
      role: user.role
    };
    this.showModal = true;
  }

  save(): void {
    if (!this.form.username) return;
    const payload = {
      username: this.form.username,
      fullName: this.form.fullName || undefined,
      email: this.form.email || undefined,
      role: this.form.role
    };
    if (this.editingUser) {
      const updateData: any = { ...payload };
      if (this.form.password) updateData.password = this.form.password;
      this.userService.updateUser(this.editingUser.id, updateData).subscribe({
        next: () => { this.showModal = false; this.loadUsers(); },
        error: (err) => alert(err.error?.error || 'Erreur lors de la mise à jour')
      });
    } else {
      if (!this.form.password) { alert('Mot de passe requis'); return; }
      this.userService.createUser({ ...payload, password: this.form.password }).subscribe({
        next: () => { this.showModal = false; this.loadUsers(); },
        error: (err) => alert(err.error?.error || 'Erreur lors de la création')
      });
    }
  }

  deleteUser(user: User): void {
    if (!confirm(`Supprimer l'utilisateur "${user.username}" ?`)) return;
    this.userService.deleteUser(user.id).subscribe({
      next: () => this.loadUsers(),
      error: () => alert('Erreur lors de la suppression')
    });
  }

  getRoleLabel(role: string): string {
    const labels: Record<string, string> = {
      admin: 'Administrateur',
      cashier: 'Caissier',
      technician: 'Technicien',
      delivery: 'Livreur',
      seller: 'Vendeur'
    };
    return labels[role] || role;
  }
}
