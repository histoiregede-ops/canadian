import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { TransferService, Transfer, TransferSummary, TransferType, TransferOperator, TransferDirection } from '../../services/transfer';
import { TransfersResolved } from '../../resolvers/transfers.resolver';

@Component({
  selector: 'app-transfers',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './transfers.component.html',
  styleUrls: ['./transfers.component.css']
})
export class TransfersComponent implements OnInit {
  transfers: Transfer[] = [];
  summary: TransferSummary | null = null;
  loading = true;
  page = 1;
  totalPages = 1;
  filters: any = {};

  // Countries list for international transfers (Afrique de l'Ouest et ailleurs)
  readonly countries: { code: string; name: string; flag: string }[] = [
    { code: 'ML', name: 'Mali', flag: '🇲🇱' },
    { code: 'SN', name: 'Sénégal', flag: '🇸🇳' },
    { code: 'CI', name: 'Côte d\'Ivoire', flag: '🇨🇮' },
    { code: 'BF', name: 'Burkina Faso', flag: '🇧🇫' },
    { code: 'GN', name: 'Guinée', flag: '🇬🇳' },
    { code: 'BJ', name: 'Bénin', flag: '🇧🇯' },
    { code: 'TG', name: 'Togo', flag: '🇹🇬' },
    { code: 'NE', name: 'Niger', flag: '🇳🇪' },
    { code: 'CM', name: 'Cameroun', flag: '🇨🇲' },
    { code: 'CD', name: 'RDC', flag: '🇨🇩' },
    { code: 'FR', name: 'France', flag: '🇫🇷' },
    { code: 'OTHER', name: 'Autre pays', flag: '🌍' }
  ];

  // Opérateurs par pays
  readonly operatorsByCountry: Record<string, { value: string; label: string; icon: string }[]> = {
    ML: [
      { value: 'orange_money', label: 'Orange Money', icon: '📱' },
      { value: 'moov_money', label: 'Moov Money', icon: '📞' },
      { value: 'wave', label: 'Wave', icon: '🌊' }
    ],
    SN: [
      { value: 'orange_money', label: 'Orange Money', icon: '📱' },
      { value: 'wave', label: 'Wave', icon: '🌊' },
      { value: 'free_money', label: 'Free Money', icon: '📞' }
    ],
    CI: [
      { value: 'orange_money', label: 'Orange Money', icon: '📱' },
      { value: 'moov_money', label: 'Moov Money', icon: '📞' },
      { value: 'wave', label: 'Wave', icon: '🌊' },
      { value: 'mtn_money', label: 'MTN Money', icon: '📱' }
    ],
    BF: [
      { value: 'orange_money', label: 'Orange Money', icon: '📱' },
      { value: 'wave', label: 'Wave', icon: '🌊' }
    ],
    GN: [
      { value: 'orange_money', label: 'Orange Money', icon: '📱' },
      { value: 'moov_money', label: 'Moov Money', icon: '📞' }
    ],
    default: [
      { value: 'orange_money', label: 'Orange Money', icon: '📱' },
      { value: 'moov_money', label: 'Moov Money', icon: '📞' },
      { value: 'wave', label: 'Wave', icon: '🌊' }
    ]
  };

  // Indicateurs de frais
  readonly feeInfo = {
    national: 'Frais nationaux : 1% à 2% du montant',
    international: 'Frais internationaux : 3% à 5% du montant'
  };

  form: {
    transferType: TransferType;
    country: string;
    operator: string;
    type: TransferDirection;
    amount: number;
    fees: number;
    senderPhone: string;
    recipientPhone: string;
    customerPhone: string;
    reference: string;
    agentName: string;
    note: string;
  } = {
    transferType: 'national',
    country: 'ML',
    operator: '',
    type: 'sent',
    amount: 0,
    fees: 0,
    senderPhone: '',
    recipientPhone: '',
    customerPhone: '',
    reference: '',
    agentName: '',
    note: ''
  };

  constructor(
    private transferService: TransferService,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    const resolved = this.route.snapshot.data['data'] as TransfersResolved;
    this.transfers = resolved?.transfers?.data || [];
    this.totalPages = resolved?.transfers?.pages || 1;
    this.summary = resolved?.summary || null;
    this.loading = false;
  }

  get isInternational(): boolean {
    return this.form.transferType === 'international';
  }

  get selectedCountryName(): string {
    const c = this.countries.find(c => c.code === this.form.country);
    return c ? `${c.flag} ${c.name}` : '';
  }

  get availableOperators(): { value: string; label: string; icon: string }[] {
    return this.operatorsByCountry[this.form.country] || this.operatorsByCountry['default'];
  }

  loadSummary(): void {
    this.transferService.getDailySummary().subscribe({
      next: (data) => this.summary = data,
      error: (err) => console.error('Failed to load transfer summary:', err)
    });
  }

  loadTransfers(): void {
    this.loading = true;
    const params: any = { ...this.filters, page: this.page };
    this.transferService.getTransfers(params).subscribe({
      next: (res) => {
        this.transfers = res.data;
        this.totalPages = res.pages;
        this.loading = false;
      },
      error: (err) => {
        console.error('Failed to load transfers:', err);
        this.loading = false;
      }
    });
  }

  resetFilters(): void {
    this.filters = {};
    this.page = 1;
    this.loadTransfers();
  }

  onTransferTypeChange(): void {
    // Reset operator quand on change le type de transfert
    this.form.operator = '';
    if (this.form.transferType === 'national') {
      this.form.country = 'ML';
    }
  }

  onCountryChange(): void {
    this.form.operator = '';
  }

  selectOperator(op: string): void {
    this.form.operator = op;
  }

  create(): void {
    if (!this.form.operator || !this.form.amount) return;

    const payload: any = {
      operator: this.form.operator,
      type: this.form.type,
      amount: this.form.amount,
      fees: this.form.fees || 0,
      customerPhone: this.form.customerPhone || this.form.recipientPhone || this.form.senderPhone,
      senderPhone: this.form.senderPhone,
      recipientPhone: this.form.recipientPhone,
      reference: this.form.reference,
      agentName: this.form.agentName,
      note: this.form.note,
      transferType: this.form.transferType,
      country: this.form.transferType === 'international' ? this.form.country : 'ML'
    };

    this.transferService.createTransfer(payload).subscribe({
      next: () => {
        this.resetForm();
        this.loadSummary();
        this.loadTransfers();
      },
      error: (err) => alert(err.error?.error || 'Erreur lors de la création')
    });
  }

  private resetForm(): void {
    this.form = {
      transferType: 'national',
      country: 'ML',
      operator: '',
      type: 'sent',
      amount: 0,
      fees: 0,
      senderPhone: '',
      recipientPhone: '',
      customerPhone: '',
      reference: '',
      agentName: '',
      note: ''
    };
  }

  confirm(id: string): void {
    this.transferService.confirmTransfer(id).subscribe(() => this.loadTransfers());
  }

  fail(id: string): void {
    this.transferService.failTransfer(id).subscribe(() => this.loadTransfers());
  }

  trackById(index: number, item: Transfer): string {
    return item.id;
  }

  operatorLabel(op: string): string {
    const map: Record<string, string> = {
      orange_money: 'Orange Money',
      wave: 'Wave',
      moov_money: 'Moov Money',
      free_money: 'Free Money',
      mtn_money: 'MTN Money'
    };
    return map[op] || op;
  }

  operatorIcon(op: string): string {
    const map: Record<string, string> = {
      orange_money: '📱',
      wave: '🌊',
      moov_money: '📞',
      free_money: '📞',
      mtn_money: '📱'
    };
    return map[op] || '💳';
  }

  transferTypeLabel(type?: string): string {
    if (type === 'international') return 'International';
    return 'National';
  }

  countryFlag(code?: string): string {
    const c = this.countries.find(c => c.code === code);
    return c ? c.flag : '🌍';
  }

  countryName(code?: string): string {
    const c = this.countries.find(c => c.code === code);
    return c ? c.name : code || '—';
  }

  statusLabel(status: string): string {
    const map: Record<string, string> = {
      pending: 'En attente',
      completed: 'Complété',
      failed: 'Échoué',
      cancelled: 'Annulé'
    };
    return map[status] || status;
  }

  statusClass(status: string): string {
    const map: Record<string, string> = {
      pending: 'warning',
      completed: 'success',
      failed: 'danger',
      cancelled: 'danger'
    };
    return map[status] || 'warning';
  }

  pageChanged(p: number): void {
    if (p < 1 || p > this.totalPages) return;
    this.page = p;
    this.loadTransfers();
  }
}
