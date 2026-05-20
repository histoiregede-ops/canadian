import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CustomerService, Customer } from '../../services/customer';

@Component({
  selector: 'app-customers',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './customers.component.html',
  styleUrls: ['./customers.component.css']
})
export class CustomersComponent implements OnInit {
  customers: Customer[] = [];
  searchQuery = '';
  loading = true;
  showModal = false;
  isEditing = false;

  currentCustomer: Customer = this.initCustomer();

  constructor(private customerService: CustomerService) {}

  ngOnInit(): void {
    this.loadCustomers();
  }

  get filteredCustomers() {
    const q = (this.searchQuery ?? '').toLowerCase().trim();
    return this.customers.filter(c => {
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

  getUniqueCities(): number {
    const cities = new Set(this.customers.map(c => c.city).filter(Boolean));
    return cities.size;
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

  loadCustomers(): void {
    this.loading = true;
    this.customerService.getCustomers().subscribe({
      next: (data) => {
        this.customers = data;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading customers:', err);
        this.loading = false;
      }
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

  saveCustomer(): void {
    if (this.isEditing && this.currentCustomer.id) {
      this.customerService.updateCustomer(this.currentCustomer.id, this.currentCustomer).subscribe(() => {
        this.loadCustomers();
        this.showModal = false;
      });
    } else {
      this.customerService.createCustomer(this.currentCustomer).subscribe(() => {
        this.loadCustomers();
        this.showModal = false;
      });
    }
  }

  deleteCustomer(id: string): void {
    if (confirm('Voulez-vous supprimer ce client ?')) {
      this.customerService.deleteCustomer(id).subscribe(() => {
        this.loadCustomers();
      });
    }
  }
}
