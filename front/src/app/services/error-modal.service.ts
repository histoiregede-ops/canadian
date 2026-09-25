import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type ErrorSeverity = 'error' | 'warning' | 'critical' | 'network' | 'auth';
export type ErrorAction = 'retry' | 'close' | 'support' | 'login';

export interface AppError {
  title?: string;
  message: string;
  details?: string;
  code?: string | number;
  requestId?: string;
  severity?: ErrorSeverity;
  retryAction?: () => void;
  scrollable?: boolean;
  timestamp?: Date;
}

@Injectable({ providedIn: 'root' })
export class ErrorModalService {
  private readonly errorSubject = new BehaviorSubject<AppError | null>(null);
  readonly error$ = this.errorSubject.asObservable();

  private readonly history: AppError[] = [];
  private readonly maxHistory = 20;

  show(error: AppError): void {
    const enriched: AppError = {
      severity: 'error',
      scrollable: false,
      timestamp: new Date(),
      ...error
    };
    
    // Éviter les doublons instantanés
    const last = this.history[0];
    if (last && last.message === enriched.message && last.code === enriched.code) {
      const timeDiff = enriched.timestamp!.getTime() - (last.timestamp?.getTime() || 0);
      if (timeDiff < 2000) return;
    }

    this.history.unshift(enriched);
    if (this.history.length > this.maxHistory) this.history.pop();

    this.errorSubject.next(enriched);
  }

  showFromHttpError(err: any, context?: string): void {
    const status = err?.status;
    const requestId = err?.headers?.get?.('X-Request-ID') || err?.error?.requestId || err?.requestId;
    const serverMessage = err?.error?.error?.message || err?.error?.message || err?.error?.error || err?.message;
    
    // Ne pas afficher en modal les erreurs de validation (400) ou 401 gérées par l'interceptor
    if (status === 400 && !context?.includes('critical')) {
      return;
    }

    let appError: AppError;

    switch (status) {
      case 0:
        appError = {
          title: 'Connexion impossible',
          message: 'Le serveur ne répond pas. Vérifiez votre connexion internet ou réessayez dans quelques instants.',
          details: `URL: ${err?.url || 'inconnue'}\nErreur: ${serverMessage || 'ERR_CONNECTION_REFUSED'}`,
          code: 'ERR_NETWORK',
          severity: 'network',
          requestId,
          scrollable: true
        };
        break;
      
      case 401:
        // Géré par l'interceptor (redirection login), ne pas afficher
        return;
      
      case 403:
        appError = {
          title: 'Accès refusé',
          message: 'Vous n\'avez pas les permissions nécessaires pour effectuer cette action.',
          details: serverMessage ? `Détail: ${serverMessage}` : undefined,
          code: 403,
          severity: 'auth',
          requestId
        };
        break;
      
      case 404:
        appError = {
          title: 'Ressource introuvable',
          message: context || 'La ressource demandée n\'existe pas ou a été déplacée.',
          details: serverMessage ? `Détail: ${serverMessage}` : `URL: ${err?.url}`,
          code: 404,
          severity: 'warning',
          requestId
        };
        break;
      
      case 409:
        appError = {
          title: 'Conflit de données',
          message: serverMessage || 'Cette action entre en conflit avec des données existantes.',
          code: 409,
          severity: 'warning',
          requestId
        };
        break;
      
      case 422:
        appError = {
          title: 'Données invalides',
          message: serverMessage || 'Les données envoyées sont invalides.',
          details: err?.error?.details ? JSON.stringify(err.error.details, null, 2) : undefined,
          code: 422,
          severity: 'warning',
          requestId,
          scrollable: !!err?.error?.details
        };
        break;
      
      case 429:
        appError = {
          title: 'Trop de requêtes',
          message: 'Vous avez effectué trop de requêtes. Veuillez patienter quelques instants avant de réessayer.',
          details: `Retry-After: ${err?.headers?.get?.('Retry-After') || '60s'}`,
          code: 429,
          severity: 'warning',
          requestId
        };
        break;
      
      case 500:
      case 502:
      case 503:
      case 504:
        appError = {
          title: status === 500 ? 'Erreur serveur' : 'Service temporairement indisponible',
          message: 'Une erreur inattendue est survenue. Notre équipe a été notifiée.',
          details: `Code: ${status} ${err?.statusText || ''}\n${serverMessage ? `Message: ${serverMessage}\n` : ''}${requestId ? `Request ID: ${requestId}\n` : ''}${context ? `Contexte: ${context}` : ''}`.trim(),
          code: status,
          severity: 'critical',
          requestId,
          scrollable: true
        };
        break;
      
      default:
        if (status >= 500) {
          appError = {
            title: 'Erreur système',
            message: serverMessage || 'Une erreur inconnue est survenue.',
            details: `Status: ${status}\nURL: ${err?.url}\n${requestId ? `Request ID: ${requestId}` : ''}`,
            code: status,
            severity: 'critical',
            requestId,
            scrollable: true
          };
        } else {
          appError = {
            title: 'Erreur',
            message: serverMessage || err?.message || 'Une erreur est survenue.',
            details: err?.error ? JSON.stringify(err.error, null, 2) : undefined,
            code: status || 'UNKNOWN',
            severity: 'error',
            requestId,
            scrollable: true
          };
        }
    }

    this.show(appError);
  }

  showCritical(title: string, message: string, details?: string): void {
    this.show({ title, message, details, severity: 'critical', scrollable: !!details });
  }

  showNetworkError(retryAction?: () => void): void {
    this.show({
      title: 'Hors ligne',
      message: 'Aucune connexion internet détectée. Vérifiez votre réseau.',
      severity: 'network',
      retryAction,
      scrollable: false
    });
  }

  dismiss(): void {
    this.errorSubject.next(null);
  }

  getHistory(): AppError[] {
    return [...this.history];
  }

  clearHistory(): void {
    this.history.length = 0;
  }
}
