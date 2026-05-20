import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserService, CreateUserRequest, User } from '../../services/user';

@Component({
  selector: 'app-technicians',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './technicians.component.html',
  styleUrls: ['./technicians.component.css']
})
export class TechniciansComponent implements OnInit {
  technicians: User[] = [];
  searchQuery = '';
  loading = true;
  showModal = false;
  isEditing = false;

  currentTechnician: CreateUserRequest = {
    username: '',
    password: '',
    email: '',
    fullName: '',
    role: 'technician'
  };

  editingId: string | null = null;

  constructor(private userService: UserService) {}

  ngOnInit(): void {
    this.loadTechnicians();
  }

  get filteredTechnicians(): User[] {
    const q = this.searchQuery.toLowerCase().trim();
    if (!q) return this.technicians;
    return this.technicians.filter(user =>
      (user.fullName || '').toLowerCase().includes(q) ||
      user.email.toLowerCase().includes(q)
    );
  }

  loadTechnicians(): void {
    this.loading = true;
    this.userService.getUsers().subscribe({
      next: (users) => {
        this.technicians = users.filter(user => user.role === 'technician');
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading technicians:', err);
        this.loading = false;
      }
    });
  }

  openAddModal(): void {
    this.isEditing = false;
    this.editingId = null;
    this.currentTechnician = { username: '', password: '', email: '', fullName: '', role: 'technician' };
    this.showModal = true;
  }

  openEditModal(tech: User): void {
    this.isEditing = true;
    this.editingId = tech.id;
    this.currentTechnician = {
      username: tech.email?.split('@')[0] || '',
      password: '',
      email: tech.email,
      fullName: tech.fullName || '',
      role: 'technician'
    };
    this.showModal = true;
  }

  saveTechnician(): void {
    if (!this.currentTechnician.fullName || !this.currentTechnician.email) return;

    if (this.isEditing && this.editingId) {
      this.userService.updateUser(this.editingId, {
        fullName: this.currentTechnician.fullName,
        email: this.currentTechnician.email
      }).subscribe({
        next: () => {
          this.loadTechnicians();
          this.showModal = false;
        },
        error: (err) => console.error('Error updating technician:', err)
      });
    } else {
      if (!this.currentTechnician.username || !this.currentTechnician.password) return;
      this.userService.createUser(this.currentTechnician).subscribe({
        next: () => {
          this.loadTechnicians();
          this.showModal = false;
        },
        error: (err) => console.error('Error saving technician:', err)
      });
    }
  }

  deleteTechnician(id: string): void {
    if (confirm('Supprimer ce technicien ?')) {
      this.userService.deleteUser(id).subscribe({
        next: () => this.loadTechnicians(),
        error: (err) => console.error('Error deleting technician:', err)
      });
    }
  }

  getWithEmail(): number {
    return this.technicians.filter(t => t.email).length;
  }

  getInitials(name: string): string {
    const parts = (name || '').split(' ').filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.substring(0, 2).toUpperCase() || '?';
  }
}
