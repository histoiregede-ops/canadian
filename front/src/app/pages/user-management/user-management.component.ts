import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserService, User } from '../../services/user.service';

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
  form = { username: '', password: '', fullName: '', email: '', role: 'cashier' };
  roles = ['admin', 'seller', 'cashier', 'technician', 'delivery'];

  constructor(private userService: UserService) {}

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    this.loading = true;
    this.userService.getUsers().subscribe({
      next: (users) => { this.users = users; this.loading = false; },
      error: () => { this.loading = false; }
    });
  }

  openModal(): void {
    this.form = { username: '', password: '', fullName: '', email: '', role: 'cashier' };
    this.showModal = true;
  }

  save(): void {
    if (!this.form.username || !this.form.password) return;
    this.userService.registerUser(this.form).subscribe({
      next: () => { this.showModal = false; this.loadUsers(); },
      error: (err) => alert(err.error?.error || 'Erreur lors de la création')
    });
  }
}
