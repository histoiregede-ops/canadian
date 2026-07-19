import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { CustomerAuthService, Customer } from '../../services/customer-auth';

@Component({
  selector: 'app-profile-edit',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="profile-container">
      <div class="back-link">
        <a routerLink="/client/dashboard">&larr; Retour à mon espace</a>
      </div>

      <div class="profile-card">
        <h1>Mon Profil</h1>

        <div *ngIf="successMsg" class="alert success">{{ successMsg }}</div>
        <div *ngIf="errorMsg" class="alert error">{{ errorMsg }}</div>

        <form (ngSubmit)="save()" #profileForm="ngForm">
          <div class="form-group">
            <label>Nom complet</label>
            <input type="text" name="name" [(ngModel)]="form.name" required minlength="2">
          </div>

          <div class="form-group">
            <label>Email</label>
            <input type="email" [value]="customer?.email" disabled class="disabled">
            <small>L'email ne peut pas être modifié</small>
          </div>

          <div class="form-group">
            <label>Téléphone</label>
            <input type="tel" name="phone" [(ngModel)]="form.phone">
          </div>

          <div class="form-group">
            <label>Adresse</label>
            <input type="text" name="address" [(ngModel)]="form.address">
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>Ville</label>
              <input type="text" name="city" [(ngModel)]="form.city">
            </div>
            <div class="form-group">
              <label>Pays</label>
              <input type="text" name="country" [(ngModel)]="form.country">
            </div>
          </div>

          <hr>

          <div class="form-group">
            <label>Nouveau mot de passe (optionnel)</label>
            <input type="password" name="password" [(ngModel)]="form.password" placeholder="Laisser vide pour conserver l'actuel">
          </div>

          <div class="form-actions">
            <button type="submit" class="btn-primary" [disabled]="saving">
              {{ saving ? 'Enregistrement...' : 'Enregistrer' }}
            </button>
            <a routerLink="/client/dashboard" class="btn-cancel">Annuler</a>
          </div>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .profile-container { max-width: 600px; margin: 0 auto; padding: 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    .back-link a { color: #667eea; text-decoration: none; font-size: 14px; display: inline-block; margin-bottom: 20px; }
    .back-link a:hover { text-decoration: underline; }
    .profile-card { background: white; padding: 32px; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
    .profile-card h1 { margin: 0 0 24px; font-size: 24px; color: #1a1a2e; }
    .form-group { margin-bottom: 16px; }
    .form-group label { display: block; margin-bottom: 6px; font-weight: 500; font-size: 14px; color: #374151; }
    .form-group input { width: 100%; padding: 10px 12px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 14px; box-sizing: border-box; }
    .form-group input:focus { outline: none; border-color: #667eea; box-shadow: 0 0 0 3px rgba(102,126,234,0.1); }
    .form-group input.disabled { background: #f3f4f6; color: #9ca3af; cursor: not-allowed; }
    .form-group small { display: block; margin-top: 4px; font-size: 12px; color: #9ca3af; }
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    @media (max-width: 480px) { .form-row { grid-template-columns: 1fr; } }
    hr { border: none; border-top: 1px solid #e5e7eb; margin: 24px 0; }
    .form-actions { display: flex; gap: 12px; align-items: center; margin-top: 24px; }
    .btn-primary { padding: 10px 24px; background: #667eea; color: white; border: none; border-radius: 8px; font-size: 14px; font-weight: 500; cursor: pointer; }
    .btn-primary:hover { background: #5a67d8; }
    .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-cancel { color: #667eea; text-decoration: none; font-size: 14px; }
    .alert { padding: 12px 16px; border-radius: 8px; margin-bottom: 16px; font-size: 14px; }
    .alert.success { background: #d4edda; color: #155724; }
    .alert.error { background: #f8d7da; color: #721c24; }
  `]
})
export class ProfileEditComponent implements OnInit {
  customer: Customer | null = null;
  form = { name: '', phone: '', address: '', city: '', country: '', password: '' };
  saving = false;
  successMsg = '';
  errorMsg = '';

  constructor(
    private customerAuth: CustomerAuthService,
    private router: Router
  ) {}

  ngOnInit() {
    this.customer = this.customerAuth.getCurrentCustomer();
    if (!this.customer) {
      this.router.navigate(['/login']);
      return;
    }
    this.form.name = this.customer.name || '';
    this.form.phone = this.customer.phone || '';
    this.form.address = this.customer.address || '';
    this.form.city = this.customer.city || '';
    this.form.country = this.customer.country || '';
  }

  save() {
    if (!this.form.name || this.form.name.length < 2) return;
    this.saving = true;
    this.successMsg = '';
    this.errorMsg = '';

    const body: any = { name: this.form.name, phone: this.form.phone, address: this.form.address, city: this.form.city, country: this.form.country };
    if (this.form.password) body.password = this.form.password;

    this.customerAuth.updateProfile(body).subscribe({
      next: (updated) => {
        this.successMsg = 'Profil mis à jour avec succès !';
        this.form.password = '';
        this.saving = false;
      },
      error: (err) => {
        this.errorMsg = err.error?.error || 'Erreur lors de la mise à jour';
        this.saving = false;
      }
    });
  }
}
