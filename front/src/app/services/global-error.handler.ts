import { ErrorHandler, Injectable, Injector } from '@angular/core';
import { ErrorModalService } from './error-modal.service';

@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  constructor(private injector: Injector) {}

  handleError(error: any): void {
    console.error('[GlobalErrorHandler]', error);

    // Éviter les erreurs de chunk loading (souvent réseau temporaire)
    const message = error?.message || '';
    if (message.includes('ChunkLoadError') || message.includes('Loading chunk')) {
      const errorModal = this.injector.get(ErrorModalService);
      errorModal.show({
        title: 'Mise à jour disponible',
        message: 'Une nouvelle version de l\'application est disponible. Veuillez actualiser la page.',
        details: message,
        severity: 'warning',
        retryAction: () => window.location.reload(),
        scrollable: false
      });
      return;
    }

    // Erreurs Angular non critiques en dev -> console seulement
    const isDevError = message.includes('NG0') || message.includes('ExpressionChanged');
    if (isDevError && !error?.status) {
      return;
    }

    // Pour les erreurs non-HTTP, afficher en modal seulement si critique
    if (!error?.status && !error?.url) {
      const errorModal = this.injector.get(ErrorModalService);
      // Filtrer les erreurs mineures
      if (message && message.length < 200 && !message.includes('Http failure')) {
        // Petites erreurs -> ne pas spammer la modal, log seulement
        return;
      }
      errorModal.showCritical(
        'Erreur inattendue',
        message || 'Une erreur inattendue est survenue.',
        error?.stack ? `${message}\n\n${error.stack.substring(0, 2000)}` : undefined
      );
    }
  }
}
