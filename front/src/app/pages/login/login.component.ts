import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  username = '';
  password = '';
  loading = false;
  errorMessage = '';

  constructor(
    private authService: AuthService,
    private router: Router
  ) {
    if (this.authService.isLoggedIn()) {
      this.router.navigate([this.getDefaultStaffRoute()]);
    }
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

    this.authService.login({ username: this.username, password: this.password }).subscribe({
      next: () => {
        this.loading = false;
        // Staff toujours redirigé vers son espace selon son rôle, jamais vers le shop
        this.router.navigate([this.getDefaultStaffRoute()]);
      },
      error: () => {
        this.loading = false;
        this.errorMessage = 'Identifiants invalides. Veuillez réessayer.';
      }
    });
  }
}
