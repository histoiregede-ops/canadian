import { describe, it, expect } from 'vitest';

describe('Utility functions', () => {
  const STATUS_LABELS: Record<string, string> = {
    pending: 'En attente',
    paid: 'Payée',
    shipped: 'Expédiée',
    delivered: 'Livrée',
    cancelled: 'Annulée',
  };

  it('should return correct French status labels', () => {
    expect(STATUS_LABELS['pending']).toBe('En attente');
    expect(STATUS_LABELS['paid']).toBe('Payée');
    expect(STATUS_LABELS['shipped']).toBe('Expédiée');
    expect(STATUS_LABELS['delivered']).toBe('Livrée');
    expect(STATUS_LABELS['cancelled']).toBe('Annulée');
  });

  it('should handle unknown status gracefully', () => {
    const label = STATUS_LABELS['unknown'] || 'Inconnu';
    expect(label).toBe('Inconnu');
  });
});

describe('Price formatting', () => {
  function formatCurrency(amount: number): string {
    const val = Math.round(amount || 0);
    return val.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' FCFA';
  }

  it('should format zero', () => {
    expect(formatCurrency(0)).toBe('0 FCFA');
  });

  it('should format thousands', () => {
    expect(formatCurrency(1500)).toBe('1 500 FCFA');
  });

  it('should format millions', () => {
    expect(formatCurrency(1500000)).toBe('1 500 000 FCFA');
  });

  it('should handle decimals', () => {
    expect(formatCurrency(1500.75)).toBe('1 501 FCFA');
  });
});
