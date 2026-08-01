import { Injectable } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot } from '@angular/router';
import { AuthService } from '../services/auth';
import { ToastService } from '../services/toast.service';

@Injectable({
    providedIn: 'root'
})
export class RoleGuard implements CanActivate {
    constructor(private authService: AuthService, private router: Router, private toastService: ToastService) { }

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
            this.toastService.show('Veuillez vous connecter.', 'warning');
            this.router.navigate(['/login']);
            return false;
        }

        if (allowedRoles && !allowedRoles.includes(user?.role)) {
            this.toastService.show('Accès refusé : vous n\'avez pas les permissions nécessaires.', 'error');
            this.router.navigate([this.getDefaultRoute()]);
            return false;
        }
        return true;
    }
}
