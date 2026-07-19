import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ContactService, ContactFormData, ContactResponse } from '../../services/contact';

@Component({
  selector: 'app-contact',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  template: `
    <div class="contact-container">
      <div class="contact-header">
        <h1>Contactez-nous</h1>
        <p>Une question ? Un projet ? N'hésitez pas à nous contacter.</p>
      </div>

      <div class="contact-content">
        <!-- Formulaire de contact -->
        <div class="contact-form-section">
          <form [formGroup]="contactForm" (ngSubmit)="onSubmit()" class="contact-form">

            <!-- Nom -->
            <div class="form-group">
              <label for="name">Nom complet *</label>
              <input
                type="text"
                id="name"
                formControlName="name"
                placeholder="Votre nom complet"
                class="form-control"
                [class.error]="isFieldInvalid('name')"
              >
              <div class="error-message" *ngIf="isFieldInvalid('name')">
                {{ getFieldError('name') }}
              </div>
            </div>

            <!-- Email -->
            <div class="form-group">
              <label for="email">Email *</label>
              <input
                type="email"
                id="email"
                formControlName="email"
                placeholder="votre.email@exemple.com"
                class="form-control"
                [class.error]="isFieldInvalid('email')"
              >
              <div class="error-message" *ngIf="isFieldInvalid('email')">
                {{ getFieldError('email') }}
              </div>
            </div>

            <!-- Téléphone -->
            <div class="form-group">
              <label for="phone">Téléphone</label>
              <input
                type="tel"
                id="phone"
                formControlName="phone"
                placeholder="+212 6XX XXX XXX"
                class="form-control"
                [class.error]="isFieldInvalid('phone')"
              >
              <div class="error-message" *ngIf="isFieldInvalid('phone')">
                {{ getFieldError('phone') }}
              </div>
            </div>

            <!-- Sujet -->
            <div class="form-group">
              <label for="subject">Sujet *</label>
              <select
                id="subject"
                formControlName="subject"
                class="form-control"
                [class.error]="isFieldInvalid('subject')"
              >
                <option value="">Choisissez un sujet</option>
                <option value="Demande de devis">Demande de devis</option>
                <option value="Support technique">Support technique</option>
                <option value="Informations produits">Informations produits</option>
                <option value="Partenariat">Partenariat</option>
                <option value="Autre">Autre</option>
              </select>
              <div class="error-message" *ngIf="isFieldInvalid('subject')">
                {{ getFieldError('subject') }}
              </div>
            </div>

            <!-- Message -->
            <div class="form-group">
              <label for="message">Message *</label>
              <textarea
                id="message"
                formControlName="message"
                placeholder="Décrivez votre demande en détail..."
                rows="6"
                class="form-control"
                [class.error]="isFieldInvalid('message')"
              ></textarea>
              <div class="error-message" *ngIf="isFieldInvalid('message')">
                {{ getFieldError('message') }}
              </div>
            </div>

            <!-- Bouton d'envoi -->
            <button
              type="submit"
              class="btn-submit"
              [disabled]="contactForm.invalid || isSubmitting"
            >
              <span *ngIf="!isSubmitting">Envoyer le message</span>
              <span *ngIf="isSubmitting">
                <span class="spinner"></span>
                Envoi en cours...
              </span>
            </button>
          </form>
        </div>

        <!-- Informations de contact -->
        <div class="contact-info-section">
          <div class="contact-info">
            <h3>Informations de contact</h3>

            <div class="info-item">
              <div class="info-icon">📧</div>
              <div class="info-content">
                <strong>Email</strong>
                <p>contact@solartech.ma</p>
              </div>
            </div>

            <div class="info-item">
              <div class="info-icon">📱</div>
              <div class="info-content">
                <strong>Téléphone</strong>
                <p>+212 6XX XXX XXX</p>
              </div>
            </div>

            <div class="info-item">
              <div class="info-icon">📍</div>
              <div class="info-content">
                <strong>Adresse</strong>
                <p>Casablanca, Maroc</p>
              </div>
            </div>

            <div class="info-item">
              <div class="info-icon">🕒</div>
              <div class="info-content">
                <strong>Horaires</strong>
                <p>Lun - Ven: 9h - 18h</p>
                <p>Sam: 9h - 13h</p>
              </div>
            </div>
          </div>

          <div class="contact-promise">
            <h4>Notre engagement</h4>
            <ul>
              <li>✅ Réponse sous 24h</li>
              <li>✅ Devis gratuit</li>
              <li>✅ Accompagnement personnalisé</li>
              <li>✅ Expertise technique</li>
            </ul>
          </div>
        </div>
      </div>

      <!-- Messages de succès/erreur -->
      <div class="message-overlay" *ngIf="showMessage" (click)="closeMessage()">
        <div class="message-box" [class.success]="messageType === 'success'" [class.error]="messageType === 'error'" (click)="$event.stopPropagation()">
          <div class="message-icon">
            <span *ngIf="messageType === 'success'">✅</span>
            <span *ngIf="messageType === 'error'">❌</span>
          </div>
          <h3>{{ messageTitle }}</h3>
          <p>{{ messageText }}</p>
          <button class="btn-close" (click)="closeMessage()">Fermer</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .contact-container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    }

    .contact-header {
      text-align: center;
      margin-bottom: 40px;
    }

    .contact-header h1 {
      color: #2c3e50;
      font-size: 2.5rem;
      margin-bottom: 10px;
    }

    .contact-header p {
      color: #7f8c8d;
      font-size: 1.1rem;
    }

    .contact-content {
      display: grid;
      grid-template-columns: 2fr 1fr;
      gap: 40px;
      align-items: start;
    }

    @media (max-width: 768px) {
      .contact-content {
        grid-template-columns: 1fr;
        gap: 30px;
      }
    }

    .contact-form {
      background: white;
      padding: 30px;
      border-radius: 10px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }

    .form-group {
      margin-bottom: 20px;
    }

    .form-group label {
      display: block;
      margin-bottom: 5px;
      color: #2c3e50;
      font-weight: 600;
    }

    .form-control {
      width: 100%;
      padding: 12px;
      border: 2px solid #ecf0f1;
      border-radius: 5px;
      font-size: 16px;
      transition: border-color 0.3s ease;
    }

    .form-control:focus {
      outline: none;
      border-color: #3498db;
    }

    .form-control.error {
      border-color: #e74c3c;
    }

    .error-message {
      color: #e74c3c;
      font-size: 14px;
      margin-top: 5px;
    }

    .btn-submit {
      width: 100%;
      padding: 15px;
      background: linear-gradient(135deg, #3498db, #2980b9);
      color: white;
      border: none;
      border-radius: 5px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      transition: transform 0.2s ease;
    }

    .btn-submit:hover:not(:disabled) {
      transform: translateY(-2px);
    }

    .btn-submit:disabled {
      opacity: 0.7;
      cursor: not-allowed;
      transform: none;
    }

    .spinner {
      display: inline-block;
      width: 16px;
      height: 16px;
      border: 2px solid #ffffff;
      border-radius: 50%;
      border-top-color: transparent;
      animation: spin 1s ease-in-out infinite;
      margin-right: 8px;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .contact-info-section {
      background: white;
      padding: 30px;
      border-radius: 10px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }

    .contact-info h3 {
      color: #2c3e50;
      margin-bottom: 20px;
    }

    .info-item {
      display: flex;
      align-items: center;
      margin-bottom: 20px;
    }

    .info-icon {
      font-size: 24px;
      margin-right: 15px;
      min-width: 30px;
    }

    .info-content strong {
      display: block;
      color: #2c3e50;
      margin-bottom: 2px;
    }

    .info-content p {
      color: #7f8c8d;
      margin: 0;
    }

    .contact-promise {
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #ecf0f1;
    }

    .contact-promise h4 {
      color: #2c3e50;
      margin-bottom: 15px;
    }

    .contact-promise ul {
      list-style: none;
      padding: 0;
    }

    .contact-promise li {
      color: #34495e;
      margin-bottom: 8px;
      padding-left: 20px;
      position: relative;
    }

    .contact-promise li:before {
      content: "✓";
      color: #27ae60;
      font-weight: bold;
      position: absolute;
      left: 0;
    }

    .message-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }

    .message-box {
      background: white;
      padding: 30px;
      border-radius: 10px;
      max-width: 400px;
      width: 90%;
      text-align: center;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
    }

    .message-box.success {
      border-top: 4px solid #27ae60;
    }

    .message-box.error {
      border-top: 4px solid #e74c3c;
    }

    .message-icon {
      font-size: 48px;
      margin-bottom: 15px;
    }

    .message-box h3 {
      color: #2c3e50;
      margin-bottom: 10px;
    }

    .message-box p {
      color: #7f8c8d;
      line-height: 1.5;
      margin-bottom: 20px;
    }

    .btn-close {
      padding: 10px 20px;
      background: #3498db;
      color: white;
      border: none;
      border-radius: 5px;
      cursor: pointer;
      font-weight: 600;
    }

    .btn-close:hover {
      background: #2980b9;
    }
  `]
})
export class ContactComponent {
  contactForm: FormGroup;
  isSubmitting = false;
  showMessage = false;
  messageType: 'success' | 'error' = 'success';
  messageTitle = '';
  messageText = '';

  constructor(
    private fb: FormBuilder,
    private contactService: ContactService,
    private router: Router
  ) {
    this.contactForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.pattern(/^[\+]?[1-9][\d]{0,15}$/)]],
      subject: ['', Validators.required],
      message: ['', [Validators.required, Validators.minLength(10)]]
    });
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.contactForm.get(fieldName);
    return field ? field.invalid && field.touched : false;
  }

  getFieldError(fieldName: string): string {
    const field = this.contactForm.get(fieldName);
    if (!field || !field.errors || !field.touched) return '';

    if (field.errors['required']) {
      return 'Ce champ est obligatoire';
    }
    if (field.errors['email']) {
      return 'Adresse email invalide';
    }
    if (field.errors['minlength']) {
      return `Minimum ${field.errors['minlength'].requiredLength} caractères`;
    }
    if (field.errors['pattern']) {
      return 'Format invalide';
    }

    return 'Champ invalide';
  }

  onSubmit(): void {
    if (this.contactForm.invalid) {
      // Marquer tous les champs comme touchés pour afficher les erreurs
      Object.keys(this.contactForm.controls).forEach(key => {
        this.contactForm.get(key)?.markAsTouched();
      });
      return;
    }

    this.isSubmitting = true;

    const formData: ContactFormData = this.contactForm.value;

    this.contactService.sendContact(formData).subscribe({
      next: (response: ContactResponse) => {
        this.isSubmitting = false;
        if (response.success) {
          this.showSuccessMessage();
          this.contactForm.reset();
        } else {
          this.showErrorMessage('Erreur', response.message);
        }
      },
      error: (error) => {
        this.isSubmitting = false;
        console.error('Erreur envoi contact:', error);
        this.showErrorMessage(
          'Erreur d\'envoi',
          'Une erreur s\'est produite lors de l\'envoi de votre message. Veuillez réessayer.'
        );
      }
    });
  }

  private showSuccessMessage(): void {
    this.messageType = 'success';
    this.messageTitle = 'Message envoyé !';
    this.messageText = 'Votre message a été envoyé avec succès. Vous allez recevoir un email de confirmation et nous vous répondrons dans les plus brefs délais.';
    this.showMessage = true;
  }

  private showErrorMessage(title: string, text: string): void {
    this.messageType = 'error';
    this.messageTitle = title;
    this.messageText = text;
    this.showMessage = true;
  }

  closeMessage(): void {
    this.showMessage = false;
  }
}