import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../services/auth';
import { UserService } from '../../services/user.service';

interface CompanySettings {
  name: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  country: string;
  currency: string;
  taxRate: number;
  whatsapp: string;
}

interface NotificationSettings {
  orders: boolean;
  payments: boolean;
  lowStock: boolean;
  messages: boolean;
  installations: boolean;
  repairs: boolean;
}

interface AppearanceSettings {
  theme: 'light' | 'dark' | 'auto';
  fontSize: 'small' | 'normal' | 'large';
  sidebarCollapsed: boolean;
}

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.css']
})
export class SettingsComponent implements OnInit {
  activeTab = 'general';
  user: any = null;

  company: CompanySettings = {
    name: '',
    phone: '',
    email: '',
    address: '',
    city: 'Lomé',
    country: 'Togo',
    currency: 'FCFA',
    taxRate: 18,
    whatsapp: ''
  };

  notifications: NotificationSettings = {
    orders: true,
    payments: true,
    lowStock: true,
    messages: true,
    installations: true,
    repairs: true
  };

  appearance: AppearanceSettings = {
    theme: 'light',
    fontSize: 'normal',
    sidebarCollapsed: false
  };

  passwordForm = {
    current: '',
    newPassword: '',
    confirm: ''
  };

  saving = false;
  message: { type: 'success' | 'error'; text: string } | null = null;

  notificationItems = [
    { key: 'orders' as keyof NotificationSettings, icon: '📦', title: 'Commandes', description: 'Notifications pour nouvelles commandes' },
    { key: 'payments' as keyof NotificationSettings, icon: '💳', title: 'Paiements', description: 'Alertes de paiement reçues' },
    { key: 'lowStock' as keyof NotificationSettings, icon: '⚠️', title: 'Stocks bas', description: 'Produits sous le seuil minimum' },
    { key: 'messages' as keyof NotificationSettings, icon: '💬', title: 'Messages', description: 'Nouveaux messages clients' },
    { key: 'installations' as keyof NotificationSettings, icon: '🏗️', title: 'Installations', description: 'Mises à jour des projets solaires' },
    { key: 'repairs' as keyof NotificationSettings, icon: '🔧', title: 'Réparations', description: 'Mises à jour des dossiers SAV' }
  ];

  constructor(
    private route: ActivatedRoute,
    private http: HttpClient,
    private authService: AuthService,
    private userService: UserService
  ) {
    this.user = this.authService.getUser();
  }

  ngOnInit(): void {
    this.loadCompanySettings();
    this.loadNotifications();
    this.loadAppearance();
  }

  private loadCompanySettings(): void {
    const saved = localStorage.getItem('company_settings');
    if (saved) {
      this.company = { ...this.company, ...JSON.parse(saved) };
    } else {
      this.http.get<any>(`${environment.apiUrl}/api/config/payment-methods`).subscribe({
        next: (config) => {
          this.company.name = 'Electro Canadien';
          this.company.phone = '+228 90 00 00 00';
          this.company.email = 'contact@electro-canadien.com';
          this.company.address = 'Lomé, Togo';
          this.company.currency = config.currency || 'FCFA';
          this.company.taxRate = config.taxRate || 18;
          this.company.whatsapp = config.whatsapp || '';
        },
        error: () => {
          this.company.name = 'Electro Canadien';
          this.company.phone = '+228 90 00 00 00';
          this.company.email = 'contact@electro-canadien.com';
          this.company.address = 'Lomé, Togo';
          this.company.currency = 'FCFA';
          this.company.taxRate = 18;
          this.company.whatsapp = '';
        }
      });
    }
  }

  private loadNotifications(): void {
    const saved = localStorage.getItem('notification_settings');
    if (saved) {
      this.notifications = { ...this.notifications, ...JSON.parse(saved) };
    }
  }

  private loadAppearance(): void {
    const saved = localStorage.getItem('appearance_settings');
    if (saved) {
      this.appearance = { ...this.appearance, ...JSON.parse(saved) };
    }
  }

  saveGeneral(): void {
    this.saving = true;
    localStorage.setItem('company_settings', JSON.stringify(this.company));
    this.showMessage('success', 'Paramètres généraux enregistrés avec succès');
    this.saving = false;
  }

  changePassword(): void {
    if (!this.passwordForm.current || !this.passwordForm.newPassword) {
      this.showMessage('error', 'Veuillez remplir tous les champs');
      return;
    }
    if (this.passwordForm.newPassword !== this.passwordForm.confirm) {
      this.showMessage('error', 'Les mots de passe ne correspondent pas');
      return;
    }
    if (this.passwordForm.newPassword.length < 6) {
      this.showMessage('error', 'Le mot de passe doit contenir au moins 6 caractères');
      return;
    }

    this.saving = true;
    const userId = this.user?.id;
    if (!userId) {
      this.showMessage('error', 'Utilisateur non identifié');
      this.saving = false;
      return;
    }

    this.userService.updateUser(userId, { password: this.passwordForm.newPassword } as any).subscribe({
      next: () => {
        this.showMessage('success', 'Mot de passe modifié avec succès');
        this.passwordForm = { current: '', newPassword: '', confirm: '' };
        this.saving = false;
      },
      error: (err) => {
        this.showMessage('error', err.error?.error || 'Erreur lors du changement de mot de passe');
        this.saving = false;
      }
    });
  }

  saveNotifications(): void {
    localStorage.setItem('notification_settings', JSON.stringify(this.notifications));
    this.showMessage('success', 'Préférences de notification mises à jour');
  }

  saveAppearance(): void {
    localStorage.setItem('appearance_settings', JSON.stringify(this.appearance));
    this.applyAppearance();
    this.showMessage('success', 'Apparence appliquée');
  }

  private applyAppearance(): void {
    document.documentElement.style.fontSize = this.appearance.fontSize === 'large' ? '18px' : this.appearance.fontSize === 'small' ? '14px' : '16px';
  }

  exportData(): void {
    const data = {
      user: this.user,
      company: this.company,
      notifications: this.notifications,
      appearance: this.appearance,
      exportDate: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup-electro-canadien-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    this.showMessage('success', 'Données exportées avec succès');
  }

  importData(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        if (data.company) {
          this.company = { ...this.company, ...data.company };
          localStorage.setItem('company_settings', JSON.stringify(this.company));
        }
        if (data.notifications) {
          this.notifications = { ...this.notifications, ...data.notifications };
          localStorage.setItem('notification_settings', JSON.stringify(this.notifications));
        }
        if (data.appearance) {
          this.appearance = { ...this.appearance, ...data.appearance };
          localStorage.setItem('appearance_settings', JSON.stringify(this.appearance));
          this.applyAppearance();
        }
        this.showMessage('success', 'Données importées avec succès');
      } catch {
        this.showMessage('error', 'Fichier invalide');
      }
    };
    reader.readAsText(file);
    input.value = '';
  }

  clearAllData(): void {
    if (!confirm('Êtes-vous sûr de vouloir réinitialiser tous les paramètres ?')) return;
    localStorage.removeItem('company_settings');
    localStorage.removeItem('notification_settings');
    localStorage.removeItem('appearance_settings');
    this.loadCompanySettings();
    this.loadNotifications();
    this.loadAppearance();
    this.showMessage('success', 'Paramètres réinitialisés');
  }

  private showMessage(type: 'success' | 'error', text: string): void {
    this.message = { type, text };
    setTimeout(() => { this.message = null; }, 3000);
  }
}
