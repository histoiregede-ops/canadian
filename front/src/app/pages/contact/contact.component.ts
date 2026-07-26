import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { ContactService, ContactFormData, ContactResponse } from '../../services/contact';

@Component({
  selector: 'app-contact',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule],
  templateUrl: './contact.component.html',
  styleUrls: ['./contact.component.css']
})
export class ContactComponent {
  contactForm: FormGroup;
  isSubmitting = false;
  showMessage = false;
  messageType: 'success' | 'error' = 'success';
  messageTitle = '';
  messageText = '';

  contactInfo = [
    { icon: '✉️', label: 'Email', value: 'contact@electrocanadien.com' },
    { icon: '📞', label: 'Téléphone', value: '+228 79 80 38 56' },
    { icon: '📍', label: 'Adresse', value: 'Lomé, Togo' },
    { icon: '🕐', label: 'Horaires', value: 'Lun - Sam: 8h - 19h' }
  ];

  commitments = [
    'Réponse sous 24h',
    'Devis gratuit',
    'Accompagnement personnalisé',
    'Expertise technique'
  ];

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

    if (field.errors['required']) return 'Ce champ est obligatoire';
    if (field.errors['email']) return 'Adresse email invalide';
    if (field.errors['minlength']) return `Minimum ${field.errors['minlength'].requiredLength} caractères`;
    if (field.errors['pattern']) return 'Format invalide';
    return 'Champ invalide';
  }

  onSubmit(): void {
    if (this.contactForm.invalid) {
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
      error: () => {
        this.isSubmitting = false;
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
