import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { UserService, CreateUserRequest, User } from '../../services/user.service';
import { RefreshService } from '../../services/refresh.service';
import { ToastService } from '../../services/toast.service';
@Component({
  selector: 'app-technicians',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './technicians.component.html',
  styleUrls: ['./technicians.component.css']
})
export class TechniciansComponent implements OnInit, OnDestroy {
  technicians: User[] = [];
  searchQuery = '';
  loading = true;
  showModal = false;
  isEditing = false;
  saving = false;
  deletingId: string | null = null;

  currentTechnician: CreateUserRequest = {
    username: '',
    password: '',
    email: '',
    fullName: '',
    role: 'technician'
  };

  editingId: string | null = null;
  private refreshSub: Subscription | null = null;

  constructor(
    private route: ActivatedRoute,
    private userService: UserService,
    private refreshService: RefreshService,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    this.route.data.subscribe(({ data }) => {
      if (data) {
        this.technicians = data.technicians.filter((user: any) => user.role === 'technician');
        this.loading = false;
      }
    });
    this.refreshSub = this.refreshService.refresh$.subscribe(() => this.loadTechnicians());
  }

  ngOnDestroy(): void {
    this.refreshSub?.unsubscribe();
  }

  trackByTechnicianId(index: number, item: any): string {
    return item?.id ?? index;
  }

  get filteredTechnicians(): User[] {
    const q = this.searchQuery.toLowerCase().trim();
    if (!q) return this.technicians;
    return this.technicians.filter(user =>
      (user.fullName || '').toLowerCase().includes(q) ||
      user.email.toLowerCase().includes(q)
    );
  }

  loadTechnicians(callback?: () => void): void {
    this.loading = true;
    this.userService.getUsers().subscribe({
      next: (users) => {
        this.technicians = users.filter(user => user.role === 'technician');
        this.loading = false;
        callback?.();
      },
      error: (err) => {
        console.error('Error loading technicians:', err);
        this.loading = false;
        this.toastService.show('Impossible de charger les techniciens.', 'error');
        callback?.();
      }
    });
  }

  openAddModal(): void {
    this.saving = false;
    this.isEditing = false;
    this.editingId = null;
    this.currentTechnician = { username: '', password: '', email: '', fullName: '', role: 'technician' };
    this.showModal = true;
  }

  openEditModal(tech: User): void {
    this.saving = false;
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

  closeModal(): void {
    // Permet de fermer même si saving est bloqué, et débloque pour la prochaine ouverture
    this.showModal = false;
    // Si saving reste bloqué plus de 2s après fermeture, on le force à false pour ne pas bloquer le prochain ajout
    if (this.saving) {
      setTimeout(() => { this.saving = false; }, 500);
    }
  }

  onOverlayClick(event: MouseEvent): void {
    this.closeModal();
  }

  saveTechnician(event?: Event): void {
    event?.preventDefault();
    if (this.saving) return;

    // Normalisation avant validation/envoi
    this.currentTechnician.fullName = this.currentTechnician.fullName?.trim() || '';
    this.currentTechnician.email = this.currentTechnician.email?.trim().toLowerCase() || '';
    this.currentTechnician.username = this.currentTechnician.username?.trim() || '';

    if (!this.currentTechnician.fullName || !this.currentTechnician.email) {
      this.toastService.show('Nom complet et email requis', 'error');
      return;
    }
    // Validation email simple
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.currentTechnician.email)) {
      this.toastService.show("Format d'email invalide", 'error');
      return;
    }
    // Validation spécifique création AVANT de passer en saving
    if (!this.isEditing) {
      if (!this.currentTechnician.username || !this.currentTechnician.password) {
        this.toastService.show("Nom d'utilisateur et mot de passe requis", 'error');
        return;
      }
      if (this.currentTechnician.password.length < 6) {
        this.toastService.show('Mot de passe trop court (min 6 caractères)', 'error');
        return;
      }
    }

    this.saving = true;

    if (this.isEditing && this.editingId) {
      this.userService.updateUser(this.editingId, {
        fullName: this.currentTechnician.fullName,
        email: this.currentTechnician.email
      })
        .pipe(finalize(() => { this.saving = false; }))
        .subscribe({
          next: (saved) => {
            this.technicians = this.technicians.map(t => t.id === saved.id ? { ...t, ...saved } : t);
            this.showModal = false;
            this.refreshService.triggerRefresh();
            this.toastService.show('Technicien mis à jour', 'success');
          },
          error: (err) => {
            console.error('Error updating technician:', err);
            const msg = err.error?.error || err.error?.message || 'Erreur mise à jour technicien';
            this.toastService.show(msg, 'error');
          }
        });
    } else {
      this.userService.createUser(this.currentTechnician)
        .pipe(finalize(() => { this.saving = false; }))
        .subscribe({
          next: (saved) => {
            this.technicians = [saved, ...this.technicians];
            this.showModal = false;
            this.refreshService.triggerRefresh();
            this.toastService.show('Technicien créé', 'success');
          },
          error: (err) => {
            console.error('Error saving technician:', err);
            const msg = err.error?.error || err.error?.message || 'Erreur création technicien';
            this.toastService.show(msg, 'error');
          }
        });
    }
  }

  deleteTechnician(id: string): void {
    if (this.deletingId || !confirm('Supprimer ce technicien ?')) return;
    this.deletingId = id;
    this.userService.deleteUser(id)
      .pipe(finalize(() => { this.deletingId = null; }))
      .subscribe({
        next: () => {
          this.technicians = this.technicians.filter(t => t.id !== id);
          this.refreshService.triggerRefresh();
          this.toastService.show('Technicien supprimé', 'success');
        },
        error: (err) => {
          console.error('Error deleting technician:', err);
          this.toastService.show(err.error?.error || 'Erreur suppression technicien', 'error');
        }
      });
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
