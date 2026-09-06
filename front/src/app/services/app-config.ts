/**
 * Configuration centralisée de l'application
 * Modifier UN SEUL endroit pour impacter tout le front
 */

export const APP_CONFIG = {
  /** Numéro WhatsApp de la boutique (format international sans +) */
  whatsapp: '22377447944',

  /** Préfixe pour les liens WhatsApp */
  get whatsappUrl(): string {
    return `https://wa.me/${this.whatsapp}`;
  },

  /** Informations boutique */
  shop: {
    name: 'Electro Canadien',
    address: 'Hamdallaye ACI 2000, à côté du terrain de foot de LCBA',
    email: 'contact@electrocanadien.com',
    phones: ['+223 77 44 79 44', '+223 90 81 13 30'],
    phone: '+223 77 44 79 44',
    hours: 'Lun-Sam: 08h00 - 19h00'
  }
};

/** Helper pour générer un lien WhatsApp avec message */
export function whatsappLink(message: string): string {
  return `${APP_CONFIG.whatsappUrl}?text=${encodeURIComponent(message)}`;
}
