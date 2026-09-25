import { ApplicationConfig, LOCALE_ID, ErrorHandler } from '@angular/core';
import { provideRouter, withRouterConfig } from '@angular/router';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { HTTP_INTERCEPTORS } from '@angular/common/http';
import { registerLocaleData } from '@angular/common';
import localeFr from '@angular/common/locales/fr';

import { routes } from './app.routes';
import { AuthInterceptor } from './services/auth.interceptor';
import { GlobalErrorHandler } from './services/global-error.handler';

registerLocaleData(localeFr);

export const appConfig: ApplicationConfig = {
  providers: [
    { provide: LOCALE_ID, useValue: 'fr' },
    { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true },
    { provide: ErrorHandler, useClass: GlobalErrorHandler },
    provideRouter(routes, withRouterConfig({ onSameUrlNavigation: 'ignore' })),
    provideHttpClient(withInterceptorsFromDi())
  ]
};
