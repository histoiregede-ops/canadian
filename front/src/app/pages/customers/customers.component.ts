import { Component, OnInit, OnDestroy } from '@angular/core';
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
  searchQuery = '';
  loyaltyFilter = '';
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
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    this.route.data.subscribe(({ data }) => {
      if (data) {
        this.customers = data.customers;
        this.customers.forEach(c => this.loadLoyaltyForCustomer(c));
        this.loading = false;
      }
    });
    this.refreshSub = this.refreshService.refresh$.subscribe(() => this.loadCustomers());
  }

  ngOnDestroy(): void {
    this.refreshSub?.unsubscribe();
  }

  get filteredCustomers() {
    const q = (this.searchQuery ?? '').toLowerCase().trim();
    return this.customers.filter(c => {
      if (this.loyaltyFilter && this.getLevel(c) !== this.loyaltyFilter) return false;
      if (!q) return true;
      const name = ((c.fullName || c.name) ?? '').toLowerCase();
      const phone = (c.phone ?? '').toLowerCase();
      const email = (c.email ?? '').toLowerCase();
      return name.includes(q) || phone.includes(q) || email.includes(q);
    });
  }

  getWithEmail(): number {
    return this.customers.filter(c => c.email).length;
  }

  getWithPhone(): number {
    return this.customers.filter(c => c.phone).length;
  }

  getLoyaltyCount(level: string): number {
    return this.customers.filter(c => this.getLevel(c) === level).length;
  }

  getUniqueCities(): number {
    const cities = new Set(this.customers.map(c => c.city).filter(Boolean));
    return cities.size;
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
    if (customer.loyaltyLevel) return customer.loyaltyLevel;
    const pts = customer.points || customer.loyaltyPoints || 0;
    if (pts >= 1000) return 'platinum';
    if (pts >= 500) return 'gold';
    if (pts >= 100) return 'silver';
    return 'bronze';
  }

  loadLoyaltyForCustomer(customer: Customer): void {
    if (!customer.id) return;
    this.customerService.getCustomerLoyalty(customer.id).subscribe({
      next: (loyalty: LoyaltyData) => {
        customer.loyaltyPoints = loyalty.points;
        customer.loyaltyLevel = loyalty.level;
        customer.totalSpent = loyalty.totalSpent;
        customer.orderCount = loyalty.orderCount;
      },
      error: () => {}
    });
  }

  loadCustomers(callback?: () => void): void {
    this.loading = true;
    this.customerService.getCustomers().subscribe({
      next: (data) => {
        this.customers = data;
        this.customers.forEach(c => this.loadLoyaltyForCustomer(c));
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
      .pipe(finalize(() => { this.saving = false; }))
      .subscribe({
        next: (saved) => {
          if (isEdit) {
            this.customers = this.customers.map(c => c.id === saved.id ? { ...c, ...saved } : c);
          } else {
            this.customers = [saved, ...this.customers];
          }
          this.loadLoyaltyForCustomer(saved);
          this.showModal = false;
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
      .pipe(finalize(() => { this.deletingId = null; }))
      .subscribe({
        next: () => {
          this.customers = this.customers.filter(c => c.id !== id);
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
