import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth';
import { CustomerAuthService } from '../../services/customer-auth';

@Component({
  selector: 'app-home-redirect',
  standalone: true,
  imports: [CommonModule],
  template: `<div class="redirect-page">Redirection en cours...</div>`,
  styles: [
    `.redirect-page {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1rem;
      color: #333;
    }`
  ]
})
export class HomeRedirectComponent implements OnInit {
  constructor(
    private authService: AuthService,
    private customerAuth: CustomerAuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    if (this.authService.isLoggedIn()) {
      this.router.navigate(['/dashboard'], { replaceUrl: true });
      return;
    }

    if (this.customerAuth.isAuthenticated()) {
      this.router.navigate(['/shop'], { replaceUrl: true });
      return;
    }

    this.router.navigate(['/login'], { replaceUrl: true });
  }
}
