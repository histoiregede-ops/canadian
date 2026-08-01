import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FinanceService, Transaction, FluxJournalier } from '../../services/finance.service';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

@Component({
  selector: 'app-accounting',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './accounting.component.html',
  styleUrls: ['./accounting.component.css']
})
export class AccountingComponent implements OnInit {
  transactions: Transaction[] = [];
  summary: any = { revenue: 0, expense: 0, balance: 0 };
  selectedStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
  selectedEnd = new Date().toISOString().split('T')[0];
  fluxData: FluxJournalier | null = null;
  loading = false;
  reportLoading = false;
  showReportSection = true;

  constructor(private financeService: FinanceService) {}

  ngOnInit(): void {
    this.loadAccountingData();
    this.loadFlux();
  }

  loadAccountingData(): void {
    this.loading = true;
    this.financeService.getFinanceData().subscribe({
      next: (response) => {
        this.transactions = response.data || [];
        this.summary = response.summary || { revenue: 0, expense: 0, balance: 0 };
        this.loading = false;
      },
      error: (err) => {
        console.error('Échec du chargement de la comptabilité:', err);
        this.loading = false;
      }
    });
  }

  loadFlux(): void {
    if (!this.selectedStart || !this.selectedEnd) return;
    this.reportLoading = true;
    this.financeService.getFluxJournalier(this.selectedStart, this.selectedEnd).subscribe({
      next: (data) => {
        this.fluxData = data;
        this.reportLoading = false;
      },
      error: (err) => {
        console.error('Échec du chargement du flux journalier:', err);
        this.fluxData = null;
        this.reportLoading = false;
      }
    });
  }

  formatType(type: string): string {
    return type === 'income' ? 'Entrée' : 'Sortie';
  }

  exportPDF(): void {
    if (!this.fluxData) return;
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('Rapport de Comptabilité', 14, 20);
    doc.setFontSize(10);
    doc.text(`Période: ${this.selectedStart} au ${this.selectedEnd}`, 14, 28);

    const totals = [
      ['Entrées', `${this.fluxData.income.toLocaleString()} FCFA`],
      ['Sorties', `${this.fluxData.expense.toLocaleString()} FCFA`],
      ['Solde', `${this.fluxData.balance.toLocaleString()} FCFA`]
    ];

    autoTable(doc, {
      startY: 34,
      head: [['Type', 'Montant']],
      body: totals,
      theme: 'grid',
      headStyles: { fillColor: [37, 99, 235] }
    });

    const rows = this.fluxData.transactions.map(t => ([
      t.time || '',
      t.description,
      this.formatType(t.type),
      `${t.amount.toLocaleString()} FCFA`,
      t.comment || ''
    ]));

    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 10,
      head: [['Heure', 'Description', 'Type', 'Montant', 'Commentaire']],
      body: rows,
      theme: 'striped',
      headStyles: { fillColor: [37, 99, 235] },
      styles: { fontSize: 8 }
    });

    doc.save(`comptabilite-${this.selectedStart}-${this.selectedEnd}.pdf`);
  }

  exportXLSX(): void {
    if (!this.fluxData) return;
    const rows = this.fluxData.transactions.map(t => ({
      Heure: t.time || '',
      Description: t.description,
      Type: this.formatType(t.type),
      Montant: t.amount,
      Commentaire: t.comment || ''
    }));

    const summaryRows = [
      { Heure: '', Description: 'TOTAL ENTRÉES', Type: '', Montant: this.fluxData.income, Commentaire: '' },
      { Heure: '', Description: 'TOTAL SORTIES', Type: '', Montant: this.fluxData.expense, Commentaire: '' },
      { Heure: '', Description: 'SOLDE NET', Type: '', Montant: this.fluxData.balance, Commentaire: '' }
    ];

    const ws = XLSX.utils.json_to_sheet([...summaryRows, { Heure: '', Description: '', Type: '', Montant: '', Commentaire: '' }, ...rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Comptabilité');
    XLSX.writeFile(wb, `comptabilite-${this.selectedStart}-${this.selectedEnd}.xlsx`);
  }
}
