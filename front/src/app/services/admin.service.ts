import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface CompanySettings {
  name: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  country: string;
  currency: string;
  taxRate: number;
  whatsapp: string;
  logo?: string;
}

export interface PermissionMatrix {
  role: string;
  roleLabel: string;
  permissions: { key: string; label: string; allowed: boolean }[];
}

export interface FeatureFlag {
  key: string;
  name: string;
  description: string;
  enabled: boolean;
  icon: string;
}

export interface AppSettings {
  company: CompanySettings;
  permissions: PermissionMatrix[];
  features: FeatureFlag[];
}

@Injectable({ providedIn: 'root' })
export class AdminService {
  private apiUrl = `${environment.apiUrl}/api/admin`;

  constructor(private http: HttpClient) {}

  /** Récupérer tous les paramètres */
  getSettings(): Observable<AppSettings> {
    return this.http.get<AppSettings>(this.apiUrl).pipe(
      catchError(() => of({
        company: {
          name: 'Electro Canadien',
          phone: '+223 00 00 00 00',
          email: 'contact@electrocanadien.com',
          address: 'Hamdalaye ACI 2000',
          city: 'Bamako',
          country: 'Mali',
          currency: 'FCFA',
          taxRate: 18,
          whatsapp: '+223 00 00 00 00'
        },
        permissions: [],
        features: []
      }))
    );
  }

  /** Mettre à jour les paramètres société */
  updateCompany(settings: Partial<CompanySettings>): Observable<any> {
    return this.http.put(`${this.apiUrl}/company`, settings).pipe(
      catchError(() => of(null))
    );
  }

  /** Récupérer la matrice des permissions */
  getPermissions(): Observable<PermissionMatrix[]> {
    return this.http.get<PermissionMatrix[]>(`${this.apiUrl}/permissions`).pipe(
      catchError(() => of(this.defaultPermissions()))
    );
  }

  /** Mettre à jour les permissions */
  updatePermissions(permissions: PermissionMatrix[]): Observable<any> {
    return this.http.put(`${this.apiUrl}/permissions`, { permissions }).pipe(
      catchError(() => of(null))
    );
  }

  /** Récupérer les feature flags */
  getFeatures(): Observable<FeatureFlag[]> {
    return this.http.get<FeatureFlag[]>(`${this.apiUrl}/features`).pipe(
      catchError(() => of(this.defaultFeatures()))
    );
  }

  /** Mettre à jour un feature flag */
  updateFeature(key: string, enabled: boolean): Observable<any> {
    return this.http.put(`${this.apiUrl}/features/${key}`, { enabled }).pipe(
      catchError(() => of(null))
    );
  }

  private defaultPermissions(): PermissionMatrix[] {
    const allPermissions = [
      { key: 'dashboard', label: 'Tableau de bord' },
      { key: 'sales', label: 'Ventes (POS)' },
      { key: 'inventory', label: 'Stock' },
      { key: 'customers', label: 'Clients' },
      { key: 'orders', label: 'Commandes' },
      { key: 'receipts', label: 'Reçus' },
      { key: 'movements', label: 'Mouvements' },
      { key: 'transfers', label: 'Transferts' },
      { key: 'suppliers', label: 'Fournisseurs' },
      { key: 'purchase_orders', label: 'Achats' },
      { key: 'repairs', label: 'Réparations SAV' },
      { key: 'installations', label: 'Installations' },
      { key: 'technicians', label: 'Techniciens' },
      { key: 'finance', label: 'Finance' },
      { key: 'reports', label: 'Rapports' },
      { key: 'users', label: 'Utilisateurs' },
      { key: 'settings', label: 'Paramètres' },
      { key: 'shop', label: 'Boutique en ligne' }
    ];

    return [
      {
        role: 'admin',
        roleLabel: 'Administrateur',
        permissions: allPermissions.map(p => ({ ...p, allowed: true }))
      },
      {
        role: 'cashier',
        roleLabel: 'Caissier',
        permissions: allPermissions.map(p => ({
          ...p,
          allowed: ['dashboard', 'sales', 'inventory', 'customers', 'orders', 'receipts', 'movements', 'transfers', 'shop'].includes(p.key)
        }))
      },
      {
        role: 'technician',
        roleLabel: 'Technicien',
        permissions: allPermissions.map(p => ({
          ...p,
          allowed: ['dashboard', 'repairs', 'installations', 'inventory', 'customers', 'shop'].includes(p.key)
        }))
      },
      {
        role: 'seller',
        roleLabel: 'Commercial',
        permissions: allPermissions.map(p => ({
          ...p,
          allowed: ['dashboard', 'sales', 'customers', 'orders', 'shop'].includes(p.key)
        }))
      }
    ];
  }

  private defaultFeatures(): FeatureFlag[] {
    return [
      { key: 'online_shop', name: 'Boutique en ligne', description: 'Activer la vente en ligne pour les clients', enabled: true, icon: '🛒' },
      { key: 'mobile_money', name: 'Paiement Mobile Money', description: 'Orange Money, Wave, Moov Money', enabled: true, icon: '📱' },
      { key: 'card_payment', name: 'Paiement par carte', description: 'Accepte les paiements par carte bancaire', enabled: true, icon: '💳' },
      { key: 'customer_dashboard', name: 'Espace client', description: 'Les clients peuvent suivre leurs commandes', enabled: true, icon: '👤' },
      { key: 'repairs', name: 'SAV / Réparations', description: 'Module de gestion des réparations', enabled: true, icon: '🔧' },
      { key: 'installations', name: 'Installations solaires', description: 'Module de gestion des installations', enabled: true, icon: '☀️' },
      { key: 'loyalty', name: 'Fidélité clients', description: 'Points de fidélité et niveaux', enabled: true, icon: '⭐' },
      { key: 'notifications', name: 'Notifications', description: 'Notifications email et SMS', enabled: true, icon: '🔔' },
      { key: 'whatsapp', name: 'Whatsapp', description: 'Envoi de messages et relances via WhatsApp', enabled: true, icon: '💬' },
      { key: 'international_transfers', name: 'Transferts internationaux', description: 'Transferts Mobile Money vers d\'autres pays', enabled: true, icon: '🌍' },
      { key: 'multi_currency', name: 'Multi-devises', description: 'Afficher les prix en plusieurs devises', enabled: false, icon: '💰' }
    ];
  }
}