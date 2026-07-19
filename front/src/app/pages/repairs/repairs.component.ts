import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { RepairService, Repair } from '../../services/repair';
import { CustomerService, Customer } from '../../services/customer';
import { RefreshService } from '../../services/refresh.service';

@Component({
  selector: 'app-repairs',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './repairs.component.html',
  styleUrls: ['./repairs.component.css']
})
export class RepairsComponent implements OnInit, OnDestroy {
  repairs: Repair[] = [];
  customers: Customer[] = [];
  loading = true;
  showModal = false;
  isEditing = false;
  searchQuery = '';
  selectedStatus = '';
  selectedPriority = '';

  currentRepair: Repair = this.initRepair();
  private refreshSub: Subscription | null = null;

  constructor(
    private route: ActivatedRoute,
    private repairService: RepairService,
    private customerService: CustomerService,
    private refreshService: RefreshService
  ) {}

  ngOnInit(): void {
    this.route.data.subscribe(({ data }) => {
      if (data) {
        this.repairs = data.repairs;
        this.customers = data.customers;
        this.loading = false;
      }
    });
    this.refreshSub = this.refreshService.refresh$.subscribe(() => this.loadRepairs());
  }

  ngOnDestroy(): void {
    this.refreshSub?.unsubscribe();
  }

  private priorityWeight: any = { urgent: 0, high: 1, normal: 2, low: 3 };
  private statusWeight: any = { received: 0, in_diagnosis: 1, repairing: 2, waiting_for_parts: 3, ready: 4, delivered: 5, cancelled: 6 };

  get filteredRepairs(): Repair[] {
    const q = (this.searchQuery || '').toLowerCase();
    return this.repairs.filter(r => {
      const matchesQuery = !q || (r.brand || '').toLowerCase().includes(q) || (r.deviceType || '').toLowerCase().includes(q) || (r.serialNumber || '').toLowerCase().includes(q);
      const matchesStatus = !this.selectedStatus || r.status === this.selectedStatus;
      const matchesPriority = !this.selectedPriority || r.priority === this.selectedPriority;
      return matchesQuery && matchesStatus && matchesPriority;
    }).sort((a, b) => {
      const pA = this.priorityWeight[a.priority || 'normal'] ?? 2;
      const pB = this.priorityWeight[b.priority || 'normal'] ?? 2;
      if (pA !== pB) return pA - pB;
      const sA = this.statusWeight[a.status] ?? 9;
      const sB = this.statusWeight[b.status] ?? 9;
      return sA - sB;
    });
  }

  getActiveCount(): number {
    return this.repairs.filter(r => !['delivered', 'cancelled'].includes(r.status)).length;
  }

  getUrgentCount(): number {
    return this.repairs.filter(r => r.priority === 'urgent').length;
  }

  getReadyCount(): number {
    return this.repairs.filter(r => r.status === 'ready').length;
  }

  getDeviceIcon(device: string): string {
    const d = (device || '').toLowerCase();
    if (d.includes('iphone') || d.includes('samsung') || d.includes('phone') || d.includes('téléphone') || d.includes('mobile') || d.includes('smartphone')) return '📱';
    if (d.includes('macbook') || d.includes('laptop') || d.includes('pc') || d.includes('ordinateur') || d.includes('notebook')) return '💻';
    if (d.includes('tv') || d.includes('télé') || d.includes('television') || d.includes('écran') || d.includes('monitor') || d.includes('screen')) return '📺';
    if (d.includes('tablet') || d.includes('ipad') || d.includes('tablette')) return '📟';
    if (d.includes('imprimante') || d.includes('printer')) return '🖨️';
    if (d.includes('enceinte') || d.includes('speaker') || d.includes('son')) return '🔊';
    if (d.includes('onduleur') || d.includes('inverter') || d.includes('solaire') || d.includes('panneau') || d.includes('batterie')) return '🔋';
    return '📱';
  }

  getPriorityLabel(priority: string): string {
    const labels: any = { low: 'Faible', normal: 'Normale', high: 'Haute', urgent: 'Urgent' };
    return labels[priority] || priority;
  }

  initRepair(): Repair {
    return {
      deviceType: '',
      brand: '',
      serialNumber: '',
      reportedIssue: '',
      status: 'received',
      priority: 'normal',
      estimatedCost: 0,
      customerId: ''
    };
  }

  loadCustomers(): void {
    this.customerService.getCustomers().subscribe((data: Customer[]) => {
      this.customers = data;
    });
  }

  loadRepairs(): void {
    this.loading = true;
    this.repairService.getRepairs().subscribe({
      next: (data) => {
        this.repairs = data;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading repairs:', err);
        this.loading = false;
      }
    });
  }

  openAddModal(): void {
    this.isEditing = false;
    this.currentRepair = this.initRepair();
    this.showModal = true;
  }

  openEditModal(repair: Repair): void {
    this.isEditing = true;
    this.currentRepair = { ...repair };
    this.showModal = true;
  }

  saveRepair(): void {
    if (this.isEditing && this.currentRepair.id) {
      this.repairService.updateRepair(this.currentRepair.id, this.currentRepair).subscribe(() => {
        this.loadRepairs();
        this.showModal = false;
      });
    } else {
      this.repairService.createRepair(this.currentRepair).subscribe(() => {
        this.loadRepairs();
        this.showModal = false;
      });
    }
  }

  deleteRepair(id: string): void {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce dossier de réparation ?')) {
      this.repairService.deleteRepair(id).subscribe(() => {
        this.loadRepairs();
      });
    }
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'received': return 'badge-info';
      case 'in_diagnosis': return 'badge-warning';
      case 'repairing': return 'badge-warning';
      case 'ready': return 'badge-success';
      case 'delivered': return 'badge-success';
      case 'cancelled': return 'badge-danger';
      default: return '';
    }
  }

  getStatusLabel(status: string): string {
    const labels: any = {
      received: 'Reçu',
      in_diagnosis: 'Diagnostic',
      repairing: 'En réparation',
      waiting_for_parts: 'Attente pièces',
      ready: 'Prêt',
      delivered: 'Livré',
      cancelled: 'Annulé'
    };
    return labels[status] || status;
  }
}
