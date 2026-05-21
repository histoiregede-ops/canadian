import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { CustomerAuthService } from '../../services/customer-auth';

@Component({
  selector: 'app-client-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './client-login.component.html',
  styleUrls: ['./client-login.component.css']
})
export class ClientLoginComponent {
  isRegisterMode = false;
  name = '';
  email = '';
  password = '';
  loading = false;
  errorMessage = '';

  constructor(
    private customerAuth: CustomerAuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    if (this.customerAuth.isAuthenticated()) {
      this.router.navigate(['/client/dashboard']);
    }

    this.route.queryParams.subscribe(params => {
      this.isRegisterMode = params['register'] === 'true';
    });
  }

  toggleMode(): void {
    this.isRegisterMode = !this.isRegisterMode;
    this.errorMessage = '';
    this.name = '';
    this.email = '';
    this.password = '';
  }

  onSubmit(event: Event): void {
    event.preventDefault();
    this.loading = true;
    this.errorMessage = '';

    if (this.isRegisterMode) {
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
          this.router.navigate(['/client/dashboard']);
        },
        error: (err) => {
          this.loading = false;
          if (err.status === 400 && err.error?.message === 'Customer already exists') {
            this.errorMessage = 'Un compte existe d\u00e9j\u00e0 avec cette adresse email.';
          } else {
            this.errorMessage = 'Erreur lors de la cr\u00e9ation du compte. Veuillez r\u00e9essayer.';
          }
          console.error('Register error:', err);
        }
      });
    } else {
      this.customerAuth.login(this.email.trim(), this.password).subscribe({
        next: () => {
          this.loading = false;
          this.router.navigate(['/client/dashboard']);
        },
        error: (err) => {
          this.loading = false;
          this.errorMessage = 'Email ou mot de passe incorrect.';
          console.error('Login error:', err);
        }
      });
    }
  }
}
