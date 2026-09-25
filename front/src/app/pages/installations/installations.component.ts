import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { InstallationService, Installation } from '../../services/installation';
import { CustomerService, Customer } from '../../services/customer';
import { UserService } from '../../services/user.service';
import { OrderService } from '../../services/order';
import { RefreshService } from '../../services/refresh.service';
import { ToastService } from '../../services/toast.service';
import {
  InstallationStatusClassPipe,
  InstallationStatusLabelPipe,
  InstallationUrgencyPipe,
  InstallationUrgencyLabelPipe
} from '../../pipes/optimized.pipes';

@Component({
  selector: 'app-installations',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    InstallationStatusClassPipe,
    InstallationStatusLabelPipe,
    InstallationUrgencyPipe,
    InstallationUrgencyLabelPipe
  ],
  templateUrl: './installations.component.html',
  styleUrls: ['./installations.component.css']
})
export class InstallationsComponent implements OnInit, OnDestroy {
  private _installations: Installation[] = [];
  get installations(): Installation[] { return this._installations; }
  set installations(value: Installation[]) {
    this._installations = value || [];
    this.updateSortedInstallations();
  }
  sortedInstallations: Installation[] = [];
  customers: Customer[] = [];
  technicians: any[] = [];
  orders: any[] = [];
  loading = true;
  showModal = false;
   isEditing = false;
  saving = false;
  deletingId: string | null = null;

  currentInstallation: Installation = this.initInstallation();
  private refreshSub: Subscription | null = null;

  private statusWeight: Record<string, number> = { in_progress: 0, planned: 1, survey: 2, testing: 3, completed: 4, cancelled: 5 };
  private sortedCache = new Map<string, Installation[]>();
  private urgencyCache = new Map<string, string>();
  private dateCache = new Map<string, number>();

  constructor(
    private route: ActivatedRoute,
    private installationService: InstallationService,
    private customerService: CustomerService,
    private userService: UserService,
    private orderService: OrderService,
    private refreshService: RefreshService,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    this.route.data.subscribe(({ data }) => {
      if (data) {
        this.installations = data.installations || [];
        this.customers = data.customers;
        this.technicians = data.technicians;
        this.orders = data.orders;
        this.loading = false;
      }
    });
    this.refreshSub = this.refreshService.refresh$.subscribe(() => this.loadInstallations());
  }

  private updateSortedInstallations(): void {
    const cacheKey = this._installations.map(i => `${i.id || i.location}|${i.status}|${i.scheduledDate}|${i.priority}`).join(';');
    if (this.sortedCache.has(cacheKey)) {
      this.sortedInstallations = this.sortedCache.get(cacheKey)!;
      return;
    }
    const sorted = [...this._installations].sort((a, b) => {
      const sA = this.statusWeight[a.status] ?? 9;
      const sB = this.statusWeight[b.status] ?? 9;
      if (sA !== sB) return sA - sB;
      const getTime = (d: any): number => {
        if (!d) return 0;
        const key = String(d);
        if (this.dateCache.has(key)) return this.dateCache.get(key)!;
        const t = new Date(d).getTime();
        this.dateCache.set(key, t);
        return t;
      };
      const dA = getTime(a.scheduledDate);
      const dB = getTime(b.scheduledDate);
      return dA - dB;
    });
    this.sortedCache.set(cacheKey, sorted);
    // limit cache size
    if (this.sortedCache.size > 20) {
      const firstKey = this.sortedCache.keys().next().value;
      if (firstKey !== undefined) this.sortedCache.delete(firstKey);
    }
    if (this.dateCache.size > 100) this.dateCache.clear();
    this.sortedInstallations = sorted;
  }

  // Memoized urgency for component caching (also available via pipe)
  getCachedUrgency(install: Installation): string {
    const key = `${install.id || ''}|${install.priority || ''}|${install.status}|${install.scheduledDate || ''}`;
    if (this.urgencyCache.has(key)) return this.urgencyCache.get(key)!;
    let result: string;
    if (install.priority) result = install.priority;
    else {
      const now = new Date().getTime();
      if (install.status === 'in_progress') result = 'urgent';
      else if (install.status === 'planned' && install.scheduledDate) {
        const days = (new Date(install.scheduledDate as any).getTime() - now) / 86400000;
        if (days < 2) result = 'high';
        else result = 'low';
      } else if (install.status === 'survey') result = 'normal';
      else result = 'low';
    }
    this.urgencyCache.set(key, result);
    return result;
  }

  ngOnDestroy(): void {
    this.refreshSub?.unsubscribe();
  }

  initInstallation(): Installation {
    return {
      location: '',
      kitType: '',
      status: 'planned',
      priority: 'normal',
      scheduledDate: new Date(),
      customerId: '',
      technicianId: '',
      components: []
    };
  }

  trackByInstallId(index: number, item: any): string {
    return item?.id ?? index;
  }

  trackByComponent(index: number, item: any): string {
    return item ?? index;
  }

  trackByCustomerId(index: number, item: any): string {
    return item?.id ?? index;
  }

  trackByTechnicianId(index: number, item: any): string {
    return item?.id ?? index;
  }

  trackByOrderId(index: number, item: any): string {
    return item?.id ?? index;
  }

  loadCustomers(): void {
    this.customerService.getCustomers().subscribe({
      next: (data: Customer[]) => this.customers = data,
      error: (err) => {
        console.error('Error loading customers:', err);
        this.toastService.show('Impossible de charger les clients.', 'error');
      }
    });
  }

  loadTechnicians(): void {
    this.userService.getUsers().subscribe({
      next: (users: any[]) => {
        this.technicians = users.filter((u: any) => u.role === 'technician');
      },
      error: (err) => {
        console.error('Error loading technicians:', err);
        this.toastService.show('Impossible de charger les techniciens.', 'error');
      }
    });
  }

  loadOrders(): void {
    this.orderService.getOrders().subscribe({
      next: (data: any[]) => this.orders = data,
      error: (err: any) => {
        console.error('Error loading orders:', err);
        this.toastService.show('Impossible de charger les commandes.', 'error');
      }
    });
  }

  loadInstallations(callback?: () => void): void {
    this.loading = true;
    this.installationService.getInstallations().subscribe({
      next: (data) => {
        this.installations = data || [];
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading installations:', err);
        this.loading = false;
        this.toastService.show('Impossible de charger les installations.', 'error');
      },
      complete: () => callback?.()
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

  saveInstallation(event?: Event): void {
    if (this.saving) return;
    event?.preventDefault();
    this.saving = true;
    const isEdit = !!(this.isEditing && this.currentInstallation.id);
    const request$ = isEdit
      ? this.installationService.updateInstallation(this.currentInstallation.id!, this.currentInstallation)
      : this.installationService.createInstallation(this.currentInstallation);

    request$.pipe(finalize(() => { this.saving = false; })).subscribe({
      next: () => {
        this.loadInstallations(() => {
          this.showModal = false;
          this.refreshService.triggerRefresh();
          this.toastService.show(isEdit ? 'Installation mise à jour' : 'Installation créée', 'success');
        });
      },
      error: (err) => {
        console.error(isEdit ? 'Error updating installation:' : 'Error creating installation:', err);
        this.toastService.show(err.error?.error || (isEdit ? 'Impossible de mettre à jour l\'installation.' : 'Impossible de créer l\'installation.'), 'error');
      }
    });
  }

  deleteInstallation(id: string): void {
    if (this.deletingId || !confirm('Supprimer ce dossier d\'installation ?')) return;
    this.deletingId = id;
    this.installationService.deleteInstallation(id).pipe(finalize(() => { this.deletingId = null; })).subscribe({
      next: () => {
        this.loadInstallations(() => {
          this.refreshService.triggerRefresh();
          this.toastService.show('Installation supprimée', 'success');
        });
      },
      error: (err) => {
        console.error('Error deleting installation:', err);
        this.toastService.show(err.error?.error || 'Impossible de supprimer l\'installation.', 'error');
      }
    });
  }

}
