/**
 * Configuration centralisée de l'application
 * Modifier UN SEUL endroit pour impacter tout le front
 */

export const APP_CONFIG = {
  /** Numéro WhatsApp de la boutique (format international sans +) */
  whatsapp: '22377447844',

  /** Préfixe pour les liens WhatsApp */
  get whatsappUrl(): string {
    return `https://wa.me/${this.whatsapp}`;
  },

  /** Informations boutique */
  shop: {
    name: 'Electro Canadien',
    address: 'Mali Hamdalaye aci 2000 pres du terrain de foot',
    email: 'contact@electrocanadien.com',
    phone: '+223 77 44 78 44',
    hours: 'Lun-Sam: 08h00 - 19h00'
  }
};

/** Helper pour générer un lien WhatsApp avec message */
export function whatsappLink(message: string): string {
  return `${APP_CONFIG.whatsappUrl}?text=${encodeURIComponent(message)}`;
}
