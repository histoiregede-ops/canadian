import { Injectable } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot } from '@angular/router';
import { AuthService } from '../services/auth';

@Injectable({
    providedIn: 'root'
})
export class RoleGuard implements CanActivate {
    constructor(private authService: AuthService, private router: Router) { }

    private getDefaultRoute(): string {
        const role = this.authService.getUser()?.role;
        if (role === 'technician') return '/installations';
        if (role === 'cashier') return '/sales';
        return '/dashboard';
    }

    canActivate(route: ActivatedRouteSnapshot): boolean {
        const allowedRoles = route.data['roles'] as string[];
        const user = this.authService.getUser();

        if (!this.authService.isLoggedIn()) {
            alert("Veuillez vous connecter.");
            this.router.navigate(['/login']);
            return false;
        }

        if (allowedRoles && !allowedRoles.includes(user?.role)) {
            alert("Accès refusé : vous n'avez pas les permissions nécessaires.");
            this.router.navigate([this.getDefaultRoute()]);
            return false;
        }
        return true;
    }
}
