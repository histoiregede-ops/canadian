import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.css']
})
export class SettingsComponent {
  activeTab = 'general';
  user: any;
  
  companyName = 'SOLAR & ELECTRONICS SOLUTIONS';
  currency = 'FCFA';
  theme = 'dark';
  fontSize = 'normal';
  
  notifications = {
    orders: true,
    payments: true,
    lowStock: true,
    messages: false
  };
  
  constructor(private authService: AuthService) {
    this.user = this.authService.getUser();
  }

  saveGeneral(): void {
    console.log('Général sauvegardé:', { name: this.companyName, currency: this.currency });
    alert('✅ Paramètres généraux enregistrés !');
  }

  changePassword(): void {
    alert('✅ Demande de changement de mot de passe envoyée.');
  }

  saveNotifications(): void {
    console.log('Notifications sauvegardées:', this.notifications);
    alert('✅ Préférences de notification mises à jour !');
  }

  saveAppearance(): void {
    console.log('Apparence mise à jour:', { theme: this.theme, fontSize: this.fontSize });
    alert('✅ Paramètres d\'apparence appliqués !');
  }

  downloadData(): void {
    const data = JSON.stringify({
      user: this.user,
      company: this.companyName,
      exportDate: new Date()
    }, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mes-donnees.json';
    a.click();
    alert('✅ Données téléchargées !');
  }

  backupNow(): void {
    alert('✅ Sauvegarde en cours... Cela peut prendre quelques minutes.');
  }

  restoreBackup(): void {
    alert('✅ Sélectionnez un fichier de sauvegarde à restaurer.');
  }

  logoutAll(): void {
    if (confirm('Êtes-vous sûr? Vous serez déconnecté de tous les appareils.')) {
      alert('✅ Vous avez été déconnecté partout.');
    }
  }
}
