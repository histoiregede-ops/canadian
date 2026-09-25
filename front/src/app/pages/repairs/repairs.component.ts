import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { RepairService, Repair } from '../../services/repair';
import { CustomerService, Customer } from '../../services/customer';
import { RefreshService } from '../../services/refresh.service';
import { ToastService } from '../../services/toast.service';
import {
  RepairDeviceIconPipe,
  RepairPriorityLabelPipe,
  RepairStatusLabelPipe
} from '../../pipes/optimized.pipes';

@Component({
  selector: 'app-repairs',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RepairDeviceIconPipe,
    RepairPriorityLabelPipe,
    RepairStatusLabelPipe
  ],
  templateUrl: './repairs.component.html',
  styleUrls: ['./repairs.component.css']
})
export class RepairsComponent implements OnInit, OnDestroy {
  private _repairs: Repair[] = [];
  get repairs(): Repair[] { return this._repairs; }
  set repairs(value: Repair[]) {
    this._repairs = value || [];
    this.updateCounts();
    this.updateFilteredRepairs();
  }
  filteredRepairs: Repair[] = [];
  activeCount = 0;
  urgentCount = 0;
  readyCount = 0;

  customers: Customer[] = [];
  loading = true;
  showModal = false;
  isEditing = false;
  private _searchQuery = '';
  get searchQuery(): string { return this._searchQuery; }
  set searchQuery(v: string) { this._searchQuery = v || ''; this.updateFilteredRepairs(); }
  private _selectedStatus = '';
  get selectedStatus(): string { return this._selectedStatus; }
  set selectedStatus(v: string) { this._selectedStatus = v || ''; this.updateFilteredRepairs(); }
  private _selectedPriority = '';
  get selectedPriority(): string { return this._selectedPriority; }
  set selectedPriority(v: string) { this._selectedPriority = v || ''; this.updateFilteredRepairs(); }
  saving = false;
  deletingId: string | null = null;

  currentRepair: Repair = this.initRepair();
  private refreshSub: Subscription | null = null;
  private filterCache = new Map<string, Repair[]>();
  private countsCache = new Map<string, { active: number; urgent: number; ready: number }>();
  private deviceIconCache = new Map<string, string>();

  constructor(
    private route: ActivatedRoute,
    private repairService: RepairService,
    private customerService: CustomerService,
    private refreshService: RefreshService,
    private toastService: ToastService
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

  private priorityWeight: Record<string, number> = { urgent: 0, high: 1, normal: 2, low: 3 };
  private statusWeight: Record<string, number> = { received: 0, diagnosing: 1, in_diagnosis: 1, repairing: 2, waiting_parts: 3, waiting_for_parts: 3, ready: 4, delivered: 5, cancelled: 6 };

  private updateFilteredRepairs(): void {
    const cacheKey = `${this._searchQuery}|${this._selectedStatus}|${this._selectedPriority}|${this._repairs.length}|${this._repairs.map(r => r.id).join(',')}`;
    if (this.filterCache.has(cacheKey)) {
      this.filteredRepairs = this.filterCache.get(cacheKey)!;
      return;
    }
    const q = (this._searchQuery || '').toLowerCase();
    const filtered = this._repairs.filter(r => {
      const matchesQuery = !q || (r.brand || '').toLowerCase().includes(q) || (r.deviceType || '').toLowerCase().includes(q) || (r.serialNumber || '').toLowerCase().includes(q);
      const matchesStatus = !this._selectedStatus || r.status === this._selectedStatus
        || (this._selectedStatus === 'diagnosing' && r.status === 'in_diagnosis')
        || (this._selectedStatus === 'in_diagnosis' && r.status === 'diagnosing')
        || (this._selectedStatus === 'waiting_parts' && r.status === 'waiting_for_parts')
        || (this._selectedStatus === 'waiting_for_parts' && r.status === 'waiting_parts');
      const matchesPriority = !this._selectedPriority || r.priority === this._selectedPriority;
      return matchesQuery && matchesStatus && matchesPriority;
    }).sort((a, b) => {
      const pA = this.priorityWeight[a.priority || 'normal'] ?? 2;
      const pB = this.priorityWeight[b.priority || 'normal'] ?? 2;
      if (pA !== pB) return pA - pB;
      const sA = this.statusWeight[a.status] ?? 9;
      const sB = this.statusWeight[b.status] ?? 9;
      return sA - sB;
    });
    this.filterCache.set(cacheKey, filtered);
    if (this.filterCache.size > 20) {
      const first = this.filterCache.keys().next().value;
      if (first !== undefined) this.filterCache.delete(first);
    }
    this.filteredRepairs = filtered;
  }

  private updateCounts(): void {
    const cacheKey = `${this._repairs.length}|${this._repairs.map(r => `${r.id}:${r.status}:${r.priority}`).join(',')}`;
    if (this.countsCache.has(cacheKey)) {
      const cached = this.countsCache.get(cacheKey)!;
      this.activeCount = cached.active;
      this.urgentCount = cached.urgent;
      this.readyCount = cached.ready;
      return;
    }
    this.activeCount = this._repairs.filter(r => !['delivered', 'cancelled'].includes(r.status)).length;
    this.urgentCount = this._repairs.filter(r => r.priority === 'urgent').length;
    this.readyCount = this._repairs.filter(r => r.status === 'ready').length;
    this.countsCache.set(cacheKey, { active: this.activeCount, urgent: this.urgentCount, ready: this.readyCount });
    if (this.countsCache.size > 20) {
      const first = this.countsCache.keys().next().value;
      if (first !== undefined) this.countsCache.delete(first);
    }
  }

  // Cached device icon (used internally if needed, template uses pipe)
  getCachedDeviceIcon(device: string): string {
    const key = (device || '').toLowerCase();
    if (this.deviceIconCache.has(key)) return this.deviceIconCache.get(key)!;
    const d = key;
    let result = '📱';
    if (d.includes('iphone') || d.includes('samsung') || d.includes('phone') || d.includes('téléphone') || d.includes('mobile') || d.includes('smartphone')) result = '📱';
    else if (d.includes('macbook') || d.includes('laptop') || d.includes('pc') || d.includes('ordinateur') || d.includes('notebook')) result = '💻';
    else if (d.includes('tv') || d.includes('télé') || d.includes('television') || d.includes('écran') || d.includes('monitor') || d.includes('screen')) result = '📺';
    else if (d.includes('tablet') || d.includes('ipad') || d.includes('tablette')) result = '📟';
    else if (d.includes('imprimante') || d.includes('printer')) result = '🖨️';
    else if (d.includes('enceinte') || d.includes('speaker') || d.includes('son')) result = '🔊';
    else if (d.includes('onduleur') || d.includes('inverter') || d.includes('solaire') || d.includes('panneau') || d.includes('batterie')) result = '🔋';
    this.deviceIconCache.set(key, result);
    return result;
  }

  trackByRepairId(index: number, item: any): string {
    return item?.id ?? index;
  }

  trackByCustomerId(index: number, item: any): string {
    return item?.id ?? index;
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
    this.customerService.getCustomers().subscribe({
      next: (data: Customer[]) => {
        this.customers = data;
      },
      error: (err) => {
        console.error('Error loading customers:', err);
        this.toastService.show('Impossible de charger les clients.', 'error');
      }
    });
  }

  loadRepairs(callback?: () => void): void {
    this.loading = true;
    this.repairService.getRepairs().subscribe({
      next: (data) => {
        this.repairs = data;
        this.loading = false;
        callback?.();
      },
      error: (err) => {
        console.error('Error loading repairs:', err);
        this.loading = false;
        this.toastService.show('Impossible de charger les réparations.', 'error');
        callback?.();
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

  saveRepair(event?: Event): void {
    if (this.saving) return;
    event?.preventDefault();
    this.saving = true;
    const isEdit = !!(this.isEditing && this.currentRepair.id);
    const request$ = isEdit
      ? this.repairService.updateRepair(this.currentRepair.id!, this.currentRepair)
      : this.repairService.createRepair(this.currentRepair);

    request$.pipe(finalize(() => { this.saving = false; })).subscribe({
      next: () => {
        this.loadRepairs(() => {
          this.showModal = false;
          this.refreshService.triggerRefresh();
          this.toastService.show(isEdit ? 'Réparation mise à jour' : 'Réparation ajoutée', 'success');
        });
      },
      error: (err) => {
        console.error(isEdit ? 'Error updating repair:' : 'Error creating repair:', err);
        this.toastService.show(err.error?.error || (isEdit ? 'Impossible de mettre à jour la réparation.' : 'Impossible de créer la réparation.'), 'error');
      }
    });
  }

  deleteRepair(id: string): void {
    if (this.deletingId || !confirm('Êtes-vous sûr de vouloir supprimer ce dossier de réparation ?')) return;
    this.deletingId = id;
    this.repairService.deleteRepair(id).pipe(finalize(() => { this.deletingId = null; })).subscribe({
      next: () => {
        this.loadRepairs(() => {
          this.refreshService.triggerRefresh();
          this.toastService.show('Réparation supprimée', 'success');
        });
      },
      error: (err) => {
        console.error('Error deleting repair:', err);
        this.toastService.show(err.error?.error || 'Impossible de supprimer la réparation.', 'error');
      }
    });
  }
}
