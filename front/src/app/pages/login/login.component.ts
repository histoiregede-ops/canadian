import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  username = '';
  password = '';
  loading = false;
  errorMessage = '';

  private getDefaultRoute(): string {
    const role = this.authService.getUser()?.role;
    if (role === 'technician') return '/installations';
    if (role === 'cashier') return '/sales';
    return '/dashboard';
  }

  constructor(
    private authService: AuthService,
    private router: Router
  ) {
    if (this.authService.isLoggedIn()) {
      this.router.navigate([this.getDefaultRoute()]);
    }
  }

  onSubmit(event: Event): void {
    event.preventDefault();
    this.loading = true;
    this.errorMessage = '';

    this.authService.login({ username: this.username, password: this.password }).subscribe({
      next: () => {
        this.loading = false;
        this.router.navigate([this.getDefaultRoute()]);
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = 'Identifiants invalides. Veuillez réessayer.';
        console.error('Login error:', err);
      }
    });
  }
}
