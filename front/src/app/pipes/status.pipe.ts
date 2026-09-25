import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'statusLabel', standalone: true, pure: true })
export class StatusLabelPipe implements PipeTransform {
  private readonly map: Record<string, string> = {
    available: 'Disponible',
    out_of_stock: 'Rupture',
    on_order: 'Commandé',
    paid: 'Payé',
    pending: 'En attente',
    failed: 'Échec',
    partially_paid: 'Partiellement payé',
    cancelled: 'Annulé',
    shipped: 'Expédié',
    delivered: 'Livré',
    in_progress: 'En cours',
    completed: 'Terminé',
    survey: 'Prospection',
    planned: 'Planifié',
    testing: 'Test',
    received: 'Reçu',
    ready: 'Prêt',
    urgent: 'Urgent',
    high: 'Haute',
    normal: 'Normale',
    low: 'Basse'
  };
  transform(value: string | undefined): string {
    if (!value) return '';
    return this.map[value] || value;
  }
}

@Pipe({ name: 'statusClass', standalone: true, pure: true })
export class StatusClassPipe implements PipeTransform {
  private readonly map: Record<string, string> = {
    available: 'badge-success',
    out_of_stock: 'badge-danger',
    on_order: 'badge-warning',
    paid: 'badge-success',
    pending: 'badge-warning',
    partially_paid: 'badge-warning',
    cancelled: 'badge-danger',
    failed: 'badge-danger',
    shipped: 'badge-info',
    delivered: 'badge-success',
    in_progress: 'badge-info',
    completed: 'badge-success',
    survey: 'badge-info',
    planned: 'badge-warning',
    testing: 'badge-info',
    ready: 'badge-success',
    urgent: 'badge-danger',
    high: 'badge-danger',
    normal: 'badge-info',
    low: 'badge-neutral'
  };
  transform(value: string | undefined): string {
    if (!value) return 'badge-neutral';
    return this.map[value] || 'badge-neutral';
  }
}

@Pipe({ name: 'loyaltyLevel', standalone: true, pure: true })
export class LoyaltyLevelPipe implements PipeTransform {
  transform(level: string | undefined, points?: number): string {
    if (level) {
      const labels: Record<string, string> = {
        bronze: 'Bronze',
        silver: 'Argent',
        gold: 'Or',
        platinum: 'Platine'
      };
      return labels[level] || level;
    }
    if (points === undefined) return 'Bronze';
    if (points >= 1000) return 'Platine';
    if (points >= 500) return 'Or';
    if (points >= 100) return 'Argent';
    return 'Bronze';
  }
}
