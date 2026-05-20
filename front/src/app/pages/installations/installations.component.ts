import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InstallationService, Installation } from '../../services/installation';
import { CustomerService, Customer } from '../../services/customer';
import { UserService } from '../../services/user';

@Component({
  selector: 'app-installations',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './installations.component.html',
  styleUrls: ['./installations.component.css']
})
export class InstallationsComponent implements OnInit {
  installations: Installation[] = [];
  customers: Customer[] = [];
  technicians: any[] = [];
  loading = true;
  showModal = false;
  isEditing = false;

  currentInstallation: Installation = this.initInstallation();

  private statusWeight: any = { in_progress: 0, planned: 1, survey: 2, testing: 3, completed: 4, cancelled: 5 };

  get sortedInstallations(): Installation[] {
    return [...this.installations].sort((a, b) => {
      const sA = this.statusWeight[a.status] ?? 9;
      const sB = this.statusWeight[b.status] ?? 9;
      if (sA !== sB) return sA - sB;
      const dA = a.scheduledDate ? new Date(a.scheduledDate).getTime() : 0;
      const dB = b.scheduledDate ? new Date(b.scheduledDate).getTime() : 0;
      return dA - dB;
    });
  }

  constructor(
    private installationService: InstallationService,
    private customerService: CustomerService,
    private userService: UserService
  ) {}

  ngOnInit(): void {
    this.loadInstallations();
    this.loadCustomers();
    this.loadTechnicians();
  }

  initInstallation(): Installation {
    return {
      location: '',
      kitType: '',
      status: 'planned',
      scheduledDate: new Date(),
      customerId: '',
      technicianId: '',
      components: []
    };
  }

  loadCustomers(): void {
    this.customerService.getCustomers().subscribe((data: Customer[]) => this.customers = data);
  }

  loadTechnicians(): void {
    this.userService.getUsers().subscribe((users: any[]) => {
      this.technicians = users.filter((u: any) => u.role === 'technician');
    });
  }

  loadInstallations(): void {
    this.loading = true;
    this.installationService.getInstallations().subscribe({
      next: (data) => {
        this.installations = data;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading installations:', err);
        this.loading = false;
      }
    });
  }

  openAddModal(): void {
    this.isEditing = false;
    this.currentInstallation = this.initInstallation();
    this.showModal = true;
  }

  openEditModal(inst: Installation): void {
    this.isEditing = true;
    this.currentInstallation = { ...inst };
    this.showModal = true;
  }

  saveInstallation(): void {
    if (this.isEditing && this.currentInstallation.id) {
      this.installationService.updateInstallation(this.currentInstallation.id, this.currentInstallation).subscribe(() => {
        this.loadInstallations();
        this.showModal = false;
      });
    } else {
      this.installationService.createInstallation(this.currentInstallation).subscribe(() => {
        this.loadInstallations();
        this.showModal = false;
      });
    }
  }

  deleteInstallation(id: string): void {
    if (confirm('Supprimer ce dossier d\'installation ?')) {
      this.installationService.deleteInstallation(id).subscribe(() => {
        this.loadInstallations();
      });
    }
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'planned': return 'badge-info';
      case 'in_progress': return 'badge-warning';
      case 'completed': return 'badge-success';
      case 'cancelled': return 'badge-danger';
      default: return '';
    }
  }

  getStatusLabel(status: string): string {
    const labels: any = {
      survey: 'Étude',
      planned: 'Planifié',
      in_progress: 'En cours',
      testing: 'Tests',
      completed: 'Terminé',
      cancelled: 'Annulé'
    };
    return labels[status] || status;
  }

  getUrgencyBadge(install: Installation): string {
    const now = new Date().getTime();
    if (install.status === 'in_progress') return 'urgent';
    if (install.status === 'planned' && install.scheduledDate) {
      const days = (new Date(install.scheduledDate).getTime() - now) / 86400000;
      if (days < 2) return 'high';
    }
    if (install.status === 'survey') return 'normal';
    return 'low';
  }
}
