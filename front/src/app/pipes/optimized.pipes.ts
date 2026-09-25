import { Pipe, PipeTransform } from '@angular/core';
import { Installation } from '../services/installation';

// Dashboard: Order status -> badge
@Pipe({ name: 'orderStatusBadge', standalone: true, pure: true })
export class OrderStatusBadgePipe implements PipeTransform {
  private readonly map: Record<string, string> = {
    paid: 'badge-success',
    pending: 'badge-warning',
    partially_paid: 'badge-warning',
    cancelled: 'badge-danger',
    shipped: 'badge-success',
    delivered: 'badge-success'
  };
  private cache = new Map<string, string>();
  transform(status: string): string {
    if (!status) return 'badge-warning';
    if (this.cache.has(status)) return this.cache.get(status)!;
    const result = this.map[status] || 'badge-warning';
    this.cache.set(status, result);
    return result;
  }
}

@Pipe({ name: 'orderStatusLabel', standalone: true, pure: true })
export class OrderStatusLabelPipe implements PipeTransform {
  private readonly map: Record<string, string> = {
    paid: 'Payé',
    pending: 'En attente',
    partially_paid: 'Partiel',
    cancelled: 'Annulé',
    shipped: 'Expédié',
    delivered: 'Livré'
  };
  private cache = new Map<string, string>();
  transform(status: string): string {
    if (!status) return status;
    if (this.cache.has(status)) return this.cache.get(status)!;
    const result = this.map[status] || status;
    this.cache.set(status, result);
    return result;
  }
}

@Pipe({ name: 'priorityBadge', standalone: true, pure: true })
export class PriorityBadgePipe implements PipeTransform {
  private readonly map: Record<string, string> = {
    urgent: 'badge-danger',
    high: 'badge-warning',
    normal: 'badge-success',
    low: 'badge-success'
  };
  private cache = new Map<string, string>();
  transform(priority?: string): string {
    const key = priority || 'normal';
    if (this.cache.has(key)) return this.cache.get(key)!;
    const result = this.map[key] || 'badge-success';
    this.cache.set(key, result);
    return result;
  }
}

@Pipe({ name: 'priorityLabel', standalone: true, pure: true })
export class PriorityLabelPipe implements PipeTransform {
  private readonly map: Record<string, string> = {
    urgent: 'Urgent',
    high: 'Haute',
    normal: 'Normale',
    low: 'Basse'
  };
  private cache = new Map<string, string>();
  transform(priority?: string): string {
    const key = priority || 'normal';
    if (this.cache.has(key)) return this.cache.get(key)!;
    const result = this.map[key] || priority || 'Normale';
    this.cache.set(key, result);
    return result;
  }
}

@Pipe({ name: 'dashboardRepairStatusBadge', standalone: true, pure: true })
export class DashboardRepairStatusBadgePipe implements PipeTransform {
  private readonly map: Record<string, string> = {
    received: 'badge-warning',
    diagnosing: 'badge-warning',
    waiting_parts: 'badge-warning',
    repairing: 'badge-warning',
    ready: 'badge-success',
    delivered: 'badge-success',
    cancelled: 'badge-danger'
  };
  private cache = new Map<string, string>();
  transform(status: string): string {
    if (!status) return 'badge-warning';
    if (this.cache.has(status)) return this.cache.get(status)!;
    const result = this.map[status] || 'badge-warning';
    this.cache.set(status, result);
    return result;
  }
}

@Pipe({ name: 'dashboardRepairStatusLabel', standalone: true, pure: true })
export class DashboardRepairStatusLabelPipe implements PipeTransform {
  private readonly map: Record<string, string> = {
    received: 'Reçu',
    diagnosing: 'Diagnostic',
    waiting_parts: 'En attente pièces',
    repairing: 'En réparation',
    ready: 'Prêt',
    delivered: 'Livré',
    cancelled: 'Annulé'
  };
  private cache = new Map<string, string>();
  transform(status: string): string {
    if (!status) return status;
    if (this.cache.has(status)) return this.cache.get(status)!;
    const result = this.map[status] || status;
    this.cache.set(status, result);
    return result;
  }
}

@Pipe({ name: 'deviceIcon', standalone: true, pure: true })
export class DeviceIconPipe implements PipeTransform {
  private cache = new Map<string, string>();
  transform(deviceType: string): string {
    if (!deviceType) return '🔧';
    const key = deviceType.toLowerCase();
    if (this.cache.has(key)) return this.cache.get(key)!;
    let result = '🔧';
    const lower = key;
    if (lower.includes('phone') || lower.includes('iphone') || lower.includes('smartphone')) result = '📱';
    else if (lower.includes('laptop') || lower.includes('macbook') || lower.includes('ordinateur')) result = '💻';
    else if (lower.includes('tablet') || lower.includes('ipad')) result = '📟';
    else if (lower.includes('printer') || lower.includes('imprimante')) result = '🖨️';
    else if (lower.includes('solar') || lower.includes('panneau') || lower.includes('kit')) result = '☀️';
    this.cache.set(key, result);
    return result;
  }
}

@Pipe({ name: 'operatorLabel', standalone: true, pure: true })
export class OperatorLabelPipe implements PipeTransform {
  private readonly map: Record<string, string> = { orange_money: 'Orange Money', wave: 'Wave', moov_money: 'Moov Money' };
  private cache = new Map<string, string>();
  transform(op: string): string {
    if (!op) return op;
    if (this.cache.has(op)) return this.cache.get(op)!;
    const result = this.map[op] || op;
    this.cache.set(op, result);
    return result;
  }
}

// Installations

@Pipe({ name: 'installationStatusClass', standalone: true, pure: true })
export class InstallationStatusClassPipe implements PipeTransform {
  private cache = new Map<string, string>();
  transform(status: string): string {
    if (!status) return '';
    if (this.cache.has(status)) return this.cache.get(status)!;
    let result = '';
    switch (status) {
      case 'planned': result = 'badge-info'; break;
      case 'in_progress': result = 'badge-warning'; break;
      case 'completed': result = 'badge-success'; break;
      case 'cancelled': result = 'badge-danger'; break;
      default: result = ''; break;
    }
    this.cache.set(status, result);
    return result;
  }
}

@Pipe({ name: 'installationStatusLabel', standalone: true, pure: true })
export class InstallationStatusLabelPipe implements PipeTransform {
  private readonly labels: Record<string, string> = {
    survey: 'Étude',
    planned: 'Planifié',
    in_progress: 'En cours',
    testing: 'Tests',
    completed: 'Terminé',
    cancelled: 'Annulé'
  };
  private cache = new Map<string, string>();
  transform(status: string): string {
    if (!status) return status;
    if (this.cache.has(status)) return this.cache.get(status)!;
    const result = this.labels[status] || status;
    this.cache.set(status, result);
    return result;
  }
}

@Pipe({ name: 'installationUrgency', standalone: true, pure: true })
export class InstallationUrgencyPipe implements PipeTransform {
  private cache = new Map<string, string>();
  transform(install: Installation): string {
    if (!install) return 'low';
    const cacheKey = `${install.id || ''}|${install.priority || ''}|${install.status}|${install.scheduledDate || ''}`;
    if (this.cache.has(cacheKey)) return this.cache.get(cacheKey)!;
    let result: string;
    if (install.priority) {
      result = install.priority;
    } else {
      const now = new Date().getTime();
      if (install.status === 'in_progress') result = 'urgent';
      else if (install.status === 'planned' && install.scheduledDate) {
        const days = (new Date(install.scheduledDate as any).getTime() - now) / 86400000;
        if (days < 2) result = 'high';
        else result = 'low';
      } else if (install.status === 'survey') {
        result = 'normal';
      } else {
        result = 'low';
      }
    }
    this.cache.set(cacheKey, result);
    return result;
  }
}

@Pipe({ name: 'installationUrgencyLabel', standalone: true, pure: true })
export class InstallationUrgencyLabelPipe implements PipeTransform {
  transform(urgency: string): string {
    if (urgency === 'urgent') return 'URGENT';
    if (urgency === 'high') return 'HAUTE';
    return 'NORMAL';
  }
}

// Repairs

@Pipe({ name: 'repairDeviceIcon', standalone: true, pure: true })
export class RepairDeviceIconPipe implements PipeTransform {
  private cache = new Map<string, string>();
  transform(device: string): string {
    const key = (device || '').toLowerCase();
    if (this.cache.has(key)) return this.cache.get(key)!;
    const d = key;
    let result = '📱';
    if (d.includes('iphone') || d.includes('samsung') || d.includes('phone') || d.includes('téléphone') || d.includes('mobile') || d.includes('smartphone')) result = '📱';
    else if (d.includes('macbook') || d.includes('laptop') || d.includes('pc') || d.includes('ordinateur') || d.includes('notebook')) result = '💻';
    else if (d.includes('tv') || d.includes('télé') || d.includes('television') || d.includes('écran') || d.includes('monitor') || d.includes('screen')) result = '📺';
    else if (d.includes('tablet') || d.includes('ipad') || d.includes('tablette')) result = '📟';
    else if (d.includes('imprimante') || d.includes('printer')) result = '🖨️';
    else if (d.includes('enceinte') || d.includes('speaker') || d.includes('son')) result = '🔊';
    else if (d.includes('onduleur') || d.includes('inverter') || d.includes('solaire') || d.includes('panneau') || d.includes('batterie')) result = '🔋';
    this.cache.set(key, result);
    return result;
  }
}

@Pipe({ name: 'repairPriorityLabel', standalone: true, pure: true })
export class RepairPriorityLabelPipe implements PipeTransform {
  private readonly labels: Record<string, string> = { low: 'Faible', normal: 'Normale', high: 'Haute', urgent: 'Urgent' };
  private cache = new Map<string, string>();
  transform(priority: string): string {
    if (!priority) return priority;
    if (this.cache.has(priority)) return this.cache.get(priority)!;
    const result = this.labels[priority] || priority;
    this.cache.set(priority, result);
    return result;
  }
}

@Pipe({ name: 'repairStatusClass', standalone: true, pure: true })
export class RepairStatusClassPipe implements PipeTransform {
  private cache = new Map<string, string>();
  transform(status: string): string {
    if (!status) return '';
    if (this.cache.has(status)) return this.cache.get(status)!;
    let result = '';
    switch (status) {
      case 'received': result = 'badge-info'; break;
      case 'in_diagnosis':
      case 'diagnosing': result = 'badge-warning'; break;
      case 'repairing': result = 'badge-warning'; break;
      case 'waiting_for_parts':
      case 'waiting_parts': result = 'badge-warning'; break;
      case 'ready': result = 'badge-success'; break;
      case 'delivered': result = 'badge-success'; break;
      case 'cancelled': result = 'badge-danger'; break;
      default: result = ''; break;
    }
    this.cache.set(status, result);
    return result;
  }
}

@Pipe({ name: 'repairStatusLabel', standalone: true, pure: true })
export class RepairStatusLabelPipe implements PipeTransform {
  private readonly labels: Record<string, string> = {
    received: 'Reçu',
    diagnosing: 'Diagnostic',
    in_diagnosis: 'Diagnostic',
    repairing: 'En réparation',
    waiting_parts: 'Attente pièces',
    waiting_for_parts: 'Attente pièces',
    ready: 'Prêt',
    delivered: 'Livré',
    cancelled: 'Annulé'
  };
  private cache = new Map<string, string>();
  transform(status: string): string {
    if (!status) return status;
    if (this.cache.has(status)) return this.cache.get(status)!;
    const result = this.labels[status] || status;
    this.cache.set(status, result);
    return result;
  }
}
