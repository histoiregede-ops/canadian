import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth';
import { CustomerAuthService } from '../../services/customer-auth';

@Component({
  selector: 'app-home-redirect',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="landing-page">
      <!-- Bannière/Header -->
      <header class="landing-header">
        <div class="landing-logo">
          <span class="logo-icon">⚡</span>
          <span class="logo-text">Electro Canadien</span>
        </div>
      </header>

      <!-- Hero -->
      <section class="landing-hero">
        <h1 class="hero-title">CANADA Solar</h1>
        <p class="hero-subtitle">Electro Canadien — Mali</p>
        <p class="hero-desc">L'expertise au service de votre énergie</p>
      </section>

      <!-- Choix : Client / Staff -->
      <section class="landing-choices">
        <!-- Carte Client → Shop -->
        <a routerLink="/shop" class="choice-card card-client">
          <div class="choice-icon">🛍️</div>
          <h2 class="choice-title">Boutique en ligne</h2>
          <p class="choice-desc">
            Parcourez nos produits solaires, électroménagers et accessoires.<br>
            <strong>Accès libre, sans inscription.</strong>
          </p>
          <span class="choice-btn">Entrer dans la boutique →</span>
        </a>

        <!-- Carte Staff → Login -->
        <a routerLink="/login" class="choice-card card-staff">
          <div class="choice-icon">👤</div>
          <h2 class="choice-title">Espace Staff</h2>
          <p class="choice-desc">
            Connexion réservée aux équipes : gestion des ventes, stocks,<br>
            réparations, installations et administration.
          </p>
          <span class="choice-btn">Se connecter →</span>
        </a>
      </section>

      <!-- Footer -->
      <footer class="landing-footer">
        <p>&copy; 2026 CANADA Solar Electro Canadien — Mali</p>
      </footer>
    </div>
  `,
  styles: [`
    /* ==========================================
       Landing Page — Client / Staff
       ========================================== */

    .landing-page {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      background: var(--bg-color, #f8fafc);
    }

    /* ── Header ───────────────────────────── */

    .landing-header {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: var(--space-5) var(--space-6);
      background: var(--surface, #fff);
      border-bottom: 1px solid var(--border, #e2e8f0);
    }

    .landing-logo {
      display: flex;
      align-items: center;
      gap: var(--space-3);
    }

    .logo-icon {
      font-size: 1.75rem;
    }

    .logo-text {
      font-size: var(--font-xl, 1.25rem);
      font-weight: 800;
      color: var(--text-primary, #0f172a);
      letter-spacing: -0.02em;
    }

    /* ── Hero ──────────────────────────────── */

    .landing-hero {
      text-align: center;
      padding: var(--space-12) var(--space-6) var(--space-8);
      background: linear-gradient(135deg, var(--primary-dark, #1e3a5f) 0%, #1a1a2e 100%);
      color: #fff;
    }

    .hero-title {
      font-size: clamp(2rem, 5vw, 3.5rem);
      font-weight: 900;
      margin: 0 0 var(--space-2);
      letter-spacing: -0.03em;
    }

    .hero-subtitle {
      font-size: clamp(1rem, 2.5vw, 1.5rem);
      font-weight: 600;
      margin: 0 0 var(--space-3);
      opacity: 0.9;
    }

    .hero-desc {
      font-size: var(--font-base, 1rem);
      margin: 0;
      opacity: 0.7;
      max-width: 480px;
      margin-left: auto;
      margin-right: auto;
    }

    /* ── Cartes de choix ──────────────────── */

    .landing-choices {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: var(--space-6);
      max-width: 800px;
      margin: -var(--space-8) auto 0;
      padding: 0 var(--space-6) var(--space-10);
      position: relative;
      z-index: 1;
    }

    .choice-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      padding: var(--space-8) var(--space-6);
      background: var(--surface, #fff);
      border-radius: var(--radius-xl, 16px);
      border: 2px solid var(--border, #e2e8f0);
      box-shadow: var(--shadow-lg, 0 10px 40px rgba(0,0,0,0.08));
      text-decoration: none;
      transition: all var(--transition-base, 0.2s);
      cursor: pointer;
    }

    .choice-card:hover {
      transform: translateY(-6px);
      box-shadow: var(--shadow-xl, 0 20px 60px rgba(0,0,0,0.12));
    }

    .card-client {
      border-color: var(--mali-green, #14A34A);
    }

    .card-client:hover {
      border-color: var(--mali-green, #14A34A);
      background: linear-gradient(135deg, #fff 0%, #f0fdf4 100%);
    }

    .card-staff {
      border-color: var(--primary, #2563eb);
    }

    .card-staff:hover {
      border-color: var(--primary, #2563eb);
      background: linear-gradient(135deg, #fff 0%, #eff6ff 100%);
    }

    .choice-icon {
      font-size: 3rem;
      margin-bottom: var(--space-4);
      line-height: 1;
    }

    .choice-title {
      font-size: var(--font-2xl, 1.5rem);
      font-weight: 800;
      color: var(--text-primary, #0f172a);
      margin: 0 0 var(--space-3);
    }

    .choice-desc {
      font-size: var(--font-sm, 0.875rem);
      color: var(--text-secondary, #475569);
      line-height: 1.6;
      margin: 0 0 var(--space-6);
    }

    .choice-btn {
      display: inline-flex;
      align-items: center;
      gap: var(--space-2);
      padding: var(--space-3) var(--space-6);
      border-radius: var(--radius-lg, 12px);
      font-weight: 700;
      font-size: var(--font-sm, 0.875rem);
      transition: all var(--transition-fast, 0.15s);
    }

    .card-client .choice-btn {
      background: var(--mali-green, #14A34A);
      color: #fff;
    }

    .card-client:hover .choice-btn {
      background: #0d8a3e;
      transform: scale(1.04);
    }

    .card-staff .choice-btn {
      background: var(--primary, #2563eb);
      color: #fff;
    }

    .card-staff:hover .choice-btn {
      background: #1d4ed8;
      transform: scale(1.04);
    }

    /* ── Footer ───────────────────────────── */

    .landing-footer {
      text-align: center;
      padding: var(--space-6);
      font-size: var(--font-xs, 0.75rem);
      color: var(--text-muted, #94a3b8);
      border-top: 1px solid var(--border, #e2e8f0);
      margin-top: auto;
    }

    /* ── Responsive ───────────────────────── */

    @media (max-width: 640px) {
      .landing-hero {
        padding: var(--space-8) var(--space-4) var(--space-6);
      }

      .landing-choices {
        grid-template-columns: 1fr;
        gap: var(--space-4);
        padding: 0 var(--space-4) var(--space-8);
        margin-top: -var(--space-6);
      }

      .choice-card {
        padding: var(--space-6) var(--space-4);
      }

      .choice-icon {
        font-size: 2.5rem;
      }

      .choice-title {
        font-size: var(--font-xl, 1.25rem);
      }
    }
  `]
})
export class HomeRedirectComponent implements OnInit {
  constructor(
    private authService: AuthService,
    private customerAuth: CustomerAuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Staff connecté → dashboard
    if (this.authService.isLoggedIn()) {
      this.router.navigate(['/dashboard'], { replaceUrl: true });
      return;
    }

    // Client connecté → shop
    if (this.customerAuth.isAuthenticated()) {
      this.router.navigate(['/shop'], { replaceUrl: true });
      return;
    }

    // Non connecté : laisser la page d'accueil s'afficher
    // (les deux cartes permettent de choisir Client ou Staff)
  }
}