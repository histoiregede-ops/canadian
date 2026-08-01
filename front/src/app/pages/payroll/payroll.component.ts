import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { UserService, User } from '../../services/user.service';
import { ToastService } from '../../services/toast.service';
import * as XLSX from 'xlsx';

interface PayrollEntry {
  id: string;
  staffId: string;
  staffName: string;
  role: string;
  month: string;
  grossSalary: number;
  deductions: number;
  bonuses: number;
  netSalary: number;
  status: 'pending' | 'paid';
}

@Component({
  selector: 'app-payroll',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './payroll.component.html',
  styleUrls: ['./payroll.component.css']
})
export class PayrollComponent implements OnInit {
  staff: User[] = [];
  entries: PayrollEntry[] = [];
  selectedStaffId = '';
  selectedMonth = new Date().toISOString().slice(0, 7);
  grossSalary = 0;
  deductions = 0;
  bonuses = 0;
  status: 'pending' | 'paid' = 'pending';

  constructor(private userService: UserService, private toastService: ToastService, private route: ActivatedRoute) {}

  ngOnInit(): void {
    const resolved = this.route.snapshot.data['data'] as { staff: User[] } | undefined;
    this.staff = resolved?.staff || [];
    if (!this.staff.length) {
      this.loadStaff();
    }
  }

  loadStaff(): void {
    this.userService.getUsers().subscribe({
      next: (users) => this.staff = users.filter(u => ['technician', 'cashier'].includes(u.role)),
      error: (err) => console.error('Erreur chargement staff:', err)
    });
  }

  addPayrollEntry(): void {
    if (!this.selectedStaffId || this.grossSalary <= 0) return;
    const staff = this.staff.find(s => s.id === this.selectedStaffId);
    if (!staff) return;
    const entry: PayrollEntry = {
      id: `${this.selectedStaffId}-${this.selectedMonth}`,
      staffId: staff.id,
      staffName: staff.fullName || staff.username,
      role: staff.role,
      month: this.selectedMonth,
      grossSalary: this.grossSalary,
      deductions: this.deductions,
      bonuses: this.bonuses,
      netSalary: this.grossSalary - this.deductions + this.bonuses,
      status: this.status
    };
    const existingIndex = this.entries.findIndex(e => e.id === entry.id);
    if (existingIndex >= 0) {
      this.entries[existingIndex] = entry;
      this.toastService.show('Fiche de paie mise à jour', 'success');
    } else {
      this.entries.unshift(entry);
      this.toastService.show('Fiche de paie ajoutée', 'success');
    }
    this.resetForm();
  }

  resetForm(): void {
    this.selectedStaffId = '';
    this.grossSalary = 0;
    this.deductions = 0;
    this.bonuses = 0;
    this.status = 'pending';
  }

  deleteEntry(entry: PayrollEntry): void {
    if (!confirm(`Supprimer la fiche de paie de ${entry.staffName} pour ${entry.month} ?`)) return;
    this.entries = this.entries.filter(e => e.id !== entry.id);
    this.toastService.show('Fiche de paie supprimée', 'success');
  }

  updateEntry(entry: PayrollEntry): void {
    this.selectedStaffId = entry.staffId;
    this.selectedMonth = entry.month;
    this.grossSalary = entry.grossSalary;
    this.deductions = entry.deductions;
    this.bonuses = entry.bonuses;
    this.status = entry.status;
  }

  totalNetPayroll(): number {
    return this.entries.reduce((sum, entry) => sum + entry.netSalary, 0);
  }

  exportPayroll(): void {
    const rows = this.entries.map(entry => ({
      'Technicien / Caissier': entry.staffName,
      Role: entry.role,
      Mois: entry.month,
      'Salaire brut': entry.grossSalary,
      Déductions: entry.deductions,
      Bonus: entry.bonuses,
      'Salaire net': entry.netSalary,
      Statut: entry.status === 'paid' ? 'Payé' : 'En attente'
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Paie');
    XLSX.writeFile(wb, `paie-${this.selectedMonth}.xlsx`);
  }
}
