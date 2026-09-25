import { ChangeDetectorRef, Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { CustomerService, Customer, LoyaltyData } from '../../services/customer';
import { RefreshService } from '../../services/refresh.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-customers',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './customers.component.html',
  styleUrls: ['./customers.component.css']
})
export class CustomersComponent implements OnInit, OnDestroy {
  customers: Customer[] = [];
  private _searchQuery = '';
  get searchQuery(): string { return this._searchQuery; }
  set searchQuery(v: string) { this._searchQuery = v; this.updateFilteredCustomers(); }
  private _loyaltyFilter = '';
  get loyaltyFilter(): string { return this._loyaltyFilter; }
  set loyaltyFilter(v: string) { this._loyaltyFilter = v; this.updateFilteredCustomers(); }
  loading = true;
  showModal = false;
  isEditing = false;
  saving = false;
  deletingId: string | null = null;

  currentCustomer: Customer = this.initCustomer();
  private refreshSub: Subscription | null = null;

  constructor(
    private route: ActivatedRoute,
    private customerService: CustomerService,
    private refreshService: RefreshService,
    private toastService: ToastService,
    private changeDetector: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    // Use snapshot to avoid subscription leak + double CD
    const snap = this.route.snapshot.data['data'];
    if (snap?.customers) {
      this.customers = snap.customers;
      this.updateFilteredCustomers();
      this.updateStatsCounts();
      this.loadAllLoyalty();
      this.loading = false;
    } else {
      this.route.data.subscribe(({ data }) => {
        if (data) {
          this.customers = data.customers;
          this.updateFilteredCustomers();
          this.updateStatsCounts();
          this.loadAllLoyalty();
          this.loading = false;
        }
      });
    }
    this.refreshSub = this.refreshService.refresh$.subscribe(() => this.loadCustomers());
  }

  ngOnDestroy(): void {
    this.refreshSub?.unsubscribe();
  }

  // Memoized — évite recalcul à chaque CD
  filteredCustomers: Customer[] = [];
  withEmailCount = 0;
  withPhoneCount = 0;
  uniqueCitiesCount = 0;
  goldPlatinumCount = 0;
  private loyaltyCache = new Map<string, string>();

  private updateFilteredCustomers(): void {
    const q = (this.searchQuery ?? '').toLowerCase().trim();
    this.filteredCustomers = this.customers.filter(c => {
      if (this.loyaltyFilter && this.getLevel(c) !== this.loyaltyFilter) return false;
      if (!q) return true;
      const name = ((c.fullName || c.name) ?? '').toLowerCase();
      const phone = (c.phone ?? '').toLowerCase();
      const email = (c.email ?? '').toLowerCase();
      return name.includes(q) || phone.includes(q) || email.includes(q);
    });
  }

  private updateStatsCounts(): void {
    this.withEmailCount = this.customers.filter(c => c.email).length;
    this.withPhoneCount = this.customers.filter(c => c.phone).length;
    this.uniqueCitiesCount = new Set(this.customers.map(c => c.city).filter(Boolean)).size;
    this.goldPlatinumCount = this.customers.filter(c => {
      const lvl = this.getLevel(c);
      return lvl === 'gold' || lvl === 'platinum';
    }).length;
  }

  // Wrapper pour compatibilité template — maintenant O(1) si on utilise les champs
  getWithEmail(): number { return this.withEmailCount; }
  getWithPhone(): number { return this.withPhoneCount; }
  getUniqueCities(): number { return this.uniqueCitiesCount; }
  getLoyaltyCount(level: string): number {
    // Pour le template qui fait getLoyaltyCount('gold') + getLoyaltyCount('platinum'), on retourne le cache
    if (level === 'gold' || level === 'platinum') return this.goldPlatinumCount;
    return this.customers.filter(c => this.getLevel(c) === level).length;
  }

  trackByCustomerId(index: number, item: any): string {
    return item?.id ?? index;
  }

  getInitials(customer: Customer): string {
    const name = customer.fullName || customer.name || '';
    const parts = name.split(' ').filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.substring(0, 2).toUpperCase() || '?';
  }

  initCustomer(): Customer {
    return {
      fullName: '',
      email: '',
      phone: '',
      address: '',
      city: '',
      country: ''
    };
  }

  getLevel(customer: Customer): string {
    const cacheKey = customer.id || customer.email || JSON.stringify(customer);
    if (this.loyaltyCache.has(cacheKey)) return this.loyaltyCache.get(cacheKey)!;
    let level: string;
    if (customer.loyaltyLevel) level = customer.loyaltyLevel;
    else {
      const pts = customer.points || customer.loyaltyPoints || 0;
      if (pts >= 1000) level = 'platinum';
      else if (pts >= 500) level = 'gold';
      else if (pts >= 100) level = 'silver';
      else level = 'bronze';
    }
    this.loyaltyCache.set(cacheKey, level);
    if (this.loyaltyCache.size > 500) {
      const first = this.loyaltyCache.keys().next().value;
      if (first) this.loyaltyCache.delete(first);
    }
    return level;
  }

  loadLoyaltyForCustomer(customer: Customer): void {
    if (!customer.id) return;
    this.customerService.getCustomerLoyalty(customer.id).subscribe({
      next: (loyalty: LoyaltyData) => {
        customer.loyaltyPoints = loyalty.points;
        customer.loyaltyLevel = loyalty.level;
        customer.totalSpent = loyalty.totalSpent;
        customer.orderCount = loyalty.orderCount;
        this.loyaltyCache.delete(customer.id || '');
        this.updateFilteredCustomers();
        this.updateStatsCounts();
      },
      error: () => {}
    });
  }

  private loadAllLoyalty(): void {
    if (this.customers.length === 0) return;
    // Batch avec forkJoin + limite de 10 en parallèle pour éviter storm, une seule CD à la fin
    import('rxjs').then(({ forkJoin, of }) => {
      import('rxjs/operators').then(({ catchError }) => {
        const batchSize = 10;
        const batches: any[][] = [];
        for (let i = 0; i < this.customers.length; i += batchSize) {
          batches.push(this.customers.slice(i, i + batchSize));
        }
        const processBatch = (idx: number) => {
          if (idx >= batches.length) {
            this.updateFilteredCustomers();
            this.updateStatsCounts();
            this.changeDetector.markForCheck();
            return;
          }
          const batch = batches[idx];
          forkJoin(
            batch.map(c =>
              c.id ? this.customerService.getCustomerLoyalty(c.id).pipe(
                catchError(() => of(null))
              ) : of(null)
            )
          ).subscribe(results => {
            results.forEach((loyalty: any, i: number) => {
              if (loyalty && batch[i]) {
                batch[i].loyaltyPoints = loyalty.points;
                batch[i].loyaltyLevel = loyalty.level;
                batch[i].totalSpent = loyalty.totalSpent;
                batch[i].orderCount = loyalty.orderCount;
              }
            });
            this.loyaltyCache.clear();
            processBatch(idx + 1);
          });
        };
        processBatch(0);
      });
    });
  }

  loadCustomers(callback?: () => void): void {
    this.loading = true;
    this.customerService.getCustomers().subscribe({
      next: (data) => {
        this.customers = data;
        this.updateFilteredCustomers();
        this.updateStatsCounts();
        this.loadAllLoyalty();
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading customers:', err);
        this.loading = false;
      },
      complete: () => callback?.()
    });
  }

  openAddModal(): void {
    this.isEditing = false;
    this.currentCustomer = this.initCustomer();
    this.showModal = true;
  }

  openEditModal(customer: Customer): void {
    this.isEditing = true;
    this.currentCustomer = { ...customer };
    this.showModal = true;
  }

  saveCustomer(event?: Event): void {
    event?.preventDefault();
    if (this.saving) return;
    this.saving = true;
    const isEdit = !!(this.isEditing && this.currentCustomer.id);
    const payload = { ...this.currentCustomer };
    const request$ = isEdit
      ? this.customerService.updateCustomer(this.currentCustomer.id!, payload)
      : this.customerService.createCustomer(payload);

    request$
      .pipe(finalize(() => { this.saving = false; this.changeDetector.detectChanges(); }))
      .subscribe({
        next: (saved) => {
          if (isEdit) {
            this.customers = this.customers.map(c => c.id === saved.id ? { ...c, ...saved } : c);
          } else {
            this.customers = [saved, ...this.customers];
          }
          this.loadLoyaltyForCustomer(saved);
          this.showModal = false;
          this.changeDetector.detectChanges();
          this.refreshService.triggerRefresh();
          this.toastService.show(isEdit ? 'Client modifié avec succès.' : 'Client créé avec succès.', 'success');
        },
        error: (err) => {
          console.error('Error saving customer:', err);
          this.toastService.show(err.error?.error || err.error?.message || 'Impossible d\'enregistrer le client.', 'error');
        }
      });
  }

  deleteCustomer(id: string): void {
    if (this.deletingId || !confirm('Voulez-vous supprimer ce client ?')) return;
    this.deletingId = id;
    this.customerService.deleteCustomer(id)
      .pipe(finalize(() => { this.deletingId = null; this.changeDetector.detectChanges(); }))
      .subscribe({
        next: () => {
          this.customers = this.customers.filter(c => c.id !== id);
          this.changeDetector.detectChanges();
          this.refreshService.triggerRefresh();
          this.toastService.show('Client supprimé avec succès.', 'success');
        },
        error: (err) => {
          console.error('Error deleting customer:', err);
          this.toastService.show(err.error?.error || err.error?.message || 'Impossible de supprimer le client.', 'error');
        }
      });
  }
}
