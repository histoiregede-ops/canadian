import { Component, AfterViewInit, ViewChild, ElementRef, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Chart, registerables } from 'chart.js';
import { ActivatedRoute } from '@angular/router';
import { FinanceService, Transaction, FluxJournalier } from '../../services/finance.service';
import { CustomerService, Customer } from '../../services/customer';
import { ConfigService, ExpenseCategory } from '../../services/config';
import { RefreshService } from '../../services/refresh.service';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

Chart.register(...registerables);

@Component({
  selector: 'app-finance',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './finance.component.html',
  styleUrls: ['./finance.component.css']
})
export class FinanceComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('revenueChart') private revenueChartRef!: ElementRef;
  @ViewChild('categoryChart') private categoryChartRef!: ElementRef;

  private revenueChart: any;
  private categoryChart: any;

  transactions: Transaction[] = [];
  stats: any = { revenue: 0, paid: 0, pending: 0 };

  showModal = false;
  newTransaction: Transaction = {
    date: new Date().toISOString().split('T')[0],
    description: '',
    type: 'income',
    amount: 0,
    category: ''
  };

  customers: Customer[] = [];
  expenseCategories: ExpenseCategory[] = [];
  showReportModal = false;
  selectedStart = new Date().toISOString().split('T')[0];
  selectedEnd = new Date().toISOString().split('T')[0];
  fluxData: FluxJournalier | null = null;

  showCommentPopup = false;
  editingTransaction: Transaction | null = null;
  editingComment = '';
  private refreshSub: Subscription | null = null;

  constructor(private route: ActivatedRoute, private financeService: FinanceService, private customerService: CustomerService, private configService: ConfigService, private refreshService: RefreshService) { }

  ngOnInit(): void {
    this.loadExpenseCategories();
    this.route.data.subscribe(({ data }) => {
      if (data) {
        this.transactions = data.data.data;
        this.stats = data.data.summary;
        this.customers = data.customers;
        setTimeout(() => {
          if (data.data.chartData) {
            this.renderRevenueChart(data.data.chartData.evolution);
            if (data.data.chartData.categories && typeof data.data.chartData.categories === 'object') {
              this.renderCategoryChart(data.data.chartData.categories);
            }
          }
        }, 100);
      }
    });
    this.refreshSub = this.refreshService.refresh$.subscribe(() => this.loadFinanceData());
  }

  ngOnDestroy(): void {
    this.refreshSub?.unsubscribe();
  }

  loadCustomers(): void {
    this.customerService.getCustomers().subscribe({
      next: (data) => this.customers = data,
      error: (err) => console.error('Error loading customers:', err)
    });
  }

  loadExpenseCategories(): void {
    this.configService.getExpenseCategories().subscribe({
      next: (data) => this.expenseCategories = data,
      error: (err) => console.error('Error loading expense categories:', err)
    });
  }

  ngAfterViewInit(): void {
  }

  loadFinanceData(): void {
    this.financeService.getFinanceData().subscribe({
      next: (response) => {
        this.transactions = response.data;
        this.stats = response.summary;

        setTimeout(() => {
          if (response.chartData) {
            this.renderRevenueChart(response.chartData.evolution);
            if (response.chartData.categories && typeof response.chartData.categories === 'object') {
              this.renderCategoryChart(response.chartData.categories);
            }
          }
        }, 100);
      },
      error: (err) => console.error('Finance loading error:', err)
    });
  }

  openAddModal(): void {
    this.newTransaction = {
      date: new Date().toISOString().split('T')[0],
      description: '',
      type: 'income',
      amount: 0,
      category: ''
    };
    this.showModal = true;
  }

  saveTransaction(): void {
    if (!this.newTransaction.description || this.newTransaction.amount <= 0) {
      alert('Veuillez remplir tous les champs obligatoires.');
      return;
    }
    this.financeService.createTransaction(this.newTransaction).subscribe({
      next: () => {
        this.showModal = false;
        this.loadFinanceData();
      },
      error: (err) => {
        console.error('Error creating transaction:', err);
        alert('Erreur lors de la création de la transaction.');
      }
    });
  }

  closeModal(): void {
    this.showModal = false;
  }

  updateCustomerName(event: any): void {
    const customerId = event.target.value;
    const customer = this.customers.find(c => c.id === customerId);
    this.newTransaction.customerName = customer ? (customer.fullName || customer.name) : '';
  }

  openReportModal(): void {
    this.selectedStart = new Date().toISOString().split('T')[0];
    this.selectedEnd = new Date().toISOString().split('T')[0];
    this.showReportModal = true;
    this.loadFlux();
  }

  loadFlux(): void {
    if (!this.selectedStart || !this.selectedEnd) return;
    this.financeService.getFluxJournalier(this.selectedStart, this.selectedEnd).subscribe({
      next: (data) => this.fluxData = data,
      error: (err) => console.error('Error loading flux journalier:', err)
    });
  }

  closeReportModal(): void {
    this.showReportModal = false;
    this.fluxData = null;
  }

  openCommentPopup(t: Transaction): void {
    this.editingTransaction = t;
    this.editingComment = t.comment || '';
    this.showCommentPopup = true;
  }

  saveComment(): void {
    if (!this.editingTransaction?.id) return;
    this.financeService.updateComment(this.editingTransaction.id, this.editingComment).subscribe({
      next: () => {
        if (this.editingTransaction) {
          this.editingTransaction.comment = this.editingComment;
        }
        this.showCommentPopup = false;
        this.editingTransaction = null;
        this.editingComment = '';
      },
      error: (err) => {
        console.error('Error saving comment:', err);
        alert('Erreur lors de l\'enregistrement du commentaire.');
      }
    });
  }

  closeCommentPopup(): void {
    this.showCommentPopup = false;
    this.editingTransaction = null;
    this.editingComment = '';
  }

  exportPDF(): void {
    if (!this.fluxData) return;
    const doc = new jsPDF();
    const title = `Rapport Flux Journalier`;
    const period = `Période: ${this.selectedStart} au ${this.selectedEnd}`;

    doc.setFontSize(16);
    doc.text(title, 14, 20);
    doc.setFontSize(10);
    doc.text(period, 14, 28);

    const totals = [
      ['Entrées', `${this.fluxData.income.toLocaleString()} FCFA`],
      ['Sorties', `${this.fluxData.expense.toLocaleString()} FCFA`],
      ['Solde', `${this.fluxData.balance.toLocaleString()} FCFA`]
    ];
    autoTable(doc, {
      startY: 34,
      head: [['', 'Montant']],
      body: totals,
      theme: 'grid',
      headStyles: { fillColor: [37, 99, 235] }
    });

    const rows = this.fluxData.transactions.map(t => [
      t.time || '',
      t.customerName || '-',
      t.description,
      t.type === 'income' ? 'Entrée' : 'Sortie',
      `${(t.type === 'income' ? '+' : '-')} ${t.amount.toLocaleString()} FCFA`,
      t.comment || ''
    ]);

    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 10,
      head: [['Heure', 'Client', 'Description', 'Type', 'Montant', 'Commentaire']],
      body: rows,
      theme: 'striped',
      headStyles: { fillColor: [37, 99, 235] },
      styles: { fontSize: 8 }
    });

    doc.save(`flux-journalier-${this.selectedStart}-${this.selectedEnd}.pdf`);
  }

  exportXLSX(): void {
    if (!this.fluxData) return;
    const rows = this.fluxData.transactions.map(t => ({
      Heure: t.time || '',
      Client: t.customerName || '-',
      Description: t.description,
      Type: t.type === 'income' ? 'Entrée' : 'Sortie',
      Montant: t.amount,
      Commentaire: t.comment || ''
    }));

    const summaryRows = [
      { Heure: '', Client: '', Description: 'RÉSUMÉ', Type: '', Montant: '', Commentaire: '' },
      { Heure: '', Client: '', Description: 'Total Entrées', Type: '', Montant: this.fluxData.income, Commentaire: '' },
      { Heure: '', Client: '', Description: 'Total Sorties', Type: '', Montant: this.fluxData.expense, Commentaire: '' },
      { Heure: '', Client: '', Description: 'Solde', Type: '', Montant: this.fluxData.balance, Commentaire: '' },
      { Heure: '', Client: '', Description: '', Type: '', Montant: '', Commentaire: '' },
      ...rows
    ];

    const ws = XLSX.utils.json_to_sheet(summaryRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Flux Journalier');
    XLSX.writeFile(wb, `flux-journalier-${this.selectedStart}-${this.selectedEnd}.xlsx`);
  }

  private getLastSixMonthsLabels(): string[] {
    const monthNames = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sept', 'Oct', 'Nov', 'Déc'];
    const labels = [];
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      labels.push(monthNames[d.getMonth()]);
    }
    return labels;
  }

  private renderRevenueChart(dataValues: number[]): void {
    if (!this.revenueChartRef) return;
    const ctx = this.revenueChartRef.nativeElement.getContext('2d');

    if (this.revenueChart) this.revenueChart.destroy();

    this.revenueChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: this.getLastSixMonthsLabels(),
        datasets: [{
          label: 'Revenus (FCFA)',
          data: dataValues,
          borderColor: '#2563eb',
          backgroundColor: 'rgba(37, 99, 235, 0.1)',
          fill: true,
          tension: 0.4,
          borderWidth: 3,
          pointBackgroundColor: '#2563eb'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: true, position: 'top' } },
        scales: {
          y: { beginAtZero: true, grid: { color: '#f1f5f9' } },
          x: { grid: { display: false } }
        }
      }
    });
  }

  private renderCategoryChart(chartData: { labels: string[]; values: number[] }): void {
    if (!this.categoryChartRef) return;
    const ctx = this.categoryChartRef.nativeElement.getContext('2d');

    if (this.categoryChart) this.categoryChart.destroy();

    this.categoryChart = new Chart(ctx, {
      type: 'pie',
      data: {
        labels: chartData.labels,
        datasets: [{
          data: chartData.values,
          backgroundColor: ['#2563eb', '#22c55e', '#f59e0b', '#ef4444'],
          borderWidth: 2,
          borderColor: '#ffffff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: true, position: 'bottom', labels: { usePointStyle: true, padding: 20 } } }
      }
    });
  }

  getStatusClass(status: string): string {
    if (status === 'paid') return 'badge-success';
    if (status === 'pending') return 'badge-pending';
    return 'badge-danger';
  }

  getStatusLabel(status: string): string {
    if (status === 'paid') return 'Payé';
    if (status === 'pending') return 'En attente';
    return 'Échec';
  }

  getTypeLabel(type: string): string {
    return type === 'income' ? 'Encaissement' : 'Décaissement';
  }
}
