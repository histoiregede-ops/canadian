import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth';
import { CustomerAuthService } from '../../services/customer-auth';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  loginMode: 'staff' | 'client' = 'staff';
  isRegisterMode = false;
  username = '';
  name = '';
  email = '';
  password = '';
  loading = false;
  errorMessage = '';

  constructor(
    private authService: AuthService,
    private customerAuth: CustomerAuthService,
    private router: Router
  ) {
    if (this.authService.isLoggedIn()) {
      this.router.navigate([this.getDefaultStaffRoute()]);
    }
    if (this.customerAuth.isAuthenticated()) {
      this.router.navigate(['/shop']);
    }
  }

  switchMode(mode: 'staff' | 'client'): void {
    this.loginMode = mode;
    this.isRegisterMode = false;
    this.clearForm();
  }

  toggleRegister(): void {
    this.isRegisterMode = !this.isRegisterMode;
    this.clearForm();
    this.errorMessage = '';
  }

  private clearForm(): void {
    this.username = '';
    this.name = '';
    this.email = '';
    this.password = '';
  }

  private getDefaultStaffRoute(): string {
    const role = this.authService.getUser()?.role;
    if (role === 'technician') return '/installations';
    if (role === 'cashier') return '/sales';
    return '/dashboard';
  }

  onSubmit(event: Event): void {
    event.preventDefault();
    this.loading = true;
    this.errorMessage = '';

    if (this.loginMode === 'staff') {
      this.authService.login({ username: this.username, password: this.password }).subscribe({
        next: () => {
          this.loading = false;
          this.router.navigate([this.getDefaultStaffRoute()]);
        },
        error: () => {
          this.loading = false;
          this.errorMessage = 'Identifiants invalides. Veuillez réessayer.';
        }
      });
    } else if (this.isRegisterMode) {
      if (!this.name.trim()) {
        this.errorMessage = 'Le nom est requis.';
        this.loading = false;
        return;
      }
      this.customerAuth.register({
        name: this.name.trim(),
        email: this.email.trim(),
        password: this.password
      } as any).subscribe({
        next: () => {
          this.loading = false;
          this.router.navigate(['/shop']);
        },
        error: (err) => {
          this.loading = false;
          if (err.status === 400 && err.error?.message === 'Customer already exists') {
            this.errorMessage = 'Un compte existe déjà avec cette adresse email.';
          } else {
            this.errorMessage = 'Erreur lors de la création du compte. Veuillez réessayer.';
          }
        }
      });
    } else {
      this.customerAuth.login(this.email.trim(), this.password).subscribe({
        next: () => {
          this.loading = false;
          this.router.navigate(['/shop']);
        },
        error: () => {
          this.loading = false;
          this.errorMessage = 'Email ou mot de passe incorrect.';
        }
      });
    }
  }
}
