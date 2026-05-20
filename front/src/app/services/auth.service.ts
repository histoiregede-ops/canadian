import { Injectable } from '@angular/core';

// The project already has an AuthService implementation in auth.ts.
// This file exists to satisfy imports like '../../services/auth.service'.
import { AuthService as BaseAuthService } from './auth';

@Injectable({
  providedIn: 'root',
})
export class AuthService extends BaseAuthService {}

