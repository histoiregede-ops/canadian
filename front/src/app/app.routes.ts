import { Routes } from '@angular/router';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { InventoryComponent } from './pages/inventory/inventory.component';
import { SalesComponent } from './pages/sales/sales.component';
import { RepairsComponent } from './pages/repairs/repairs.component';
import { InstallationsComponent } from './pages/installations/installations.component';
import { CustomersComponent } from './pages/customers/customers.component';
import { TechniciansComponent } from './pages/technicians/technicians.component';
import { FinanceComponent } from './pages/finance/finance.component';
import { SettingsComponent } from './pages/settings/settings.component';
import { LoginComponent } from './pages/login/login.component';
import { CategoriesComponent } from './pages/categories/categories.component';
import { ShopComponent } from './pages/shop/shop.component';
import { CartComponent } from './pages/cart/cart.component';
import { CheckoutComponent } from './pages/checkout/checkout.component';
import { MessagesComponent } from './pages/messages/messages.component';
import { ClientMessagesComponent } from './pages/client-messages/client-messages.component';
import { ContactComponent } from './pages/contact/contact.component';
import { UserManagementComponent } from './pages/user-management/user-management.component';
import { RoleGuard } from './services/role.guard';
import { ClientDashboardComponent } from './pages/client-dashboard/client-dashboard.component';
import { OrderDetailComponent } from './pages/order-detail/order-detail.component';
import { ProfileEditComponent } from './pages/profile-edit/profile-edit.component';
import { ReportsComponent } from './pages/reports/reports.component';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  // Admin / Internal Routes
  { path: 'dashboard', component: DashboardComponent, canActivate: [RoleGuard], data: { roles: ['admin', 'cashier'] } },
  { path: 'inventory', component: InventoryComponent, canActivate: [RoleGuard], data: { roles: ['admin', 'cashier'] } },
  { path: 'categories', component: CategoriesComponent, canActivate: [RoleGuard], data: { roles: ['admin'] } },
  { path: 'sales', component: SalesComponent, canActivate: [RoleGuard], data: { roles: ['admin', 'cashier'] } },
  { path: 'repairs', component: RepairsComponent, canActivate: [RoleGuard], data: { roles: ['admin', 'technician'] } },
  { path: 'installations', component: InstallationsComponent, canActivate: [RoleGuard], data: { roles: ['admin', 'technician'] } },
  { path: 'customers', component: CustomersComponent, canActivate: [RoleGuard], data: { roles: ['admin', 'cashier'] } },
  { path: 'technicians', component: TechniciansComponent, canActivate: [RoleGuard], data: { roles: ['admin'] } },
  { path: 'finance', component: FinanceComponent, canActivate: [RoleGuard], data: { roles: ['admin'] } },
  { path: 'reports', component: ReportsComponent, canActivate: [RoleGuard], data: { roles: ['admin'] } },
  { path: 'settings', component: SettingsComponent, canActivate: [RoleGuard], data: { roles: ['admin'] } },
  { path: 'users', component: UserManagementComponent, canActivate: [RoleGuard], data: { roles: ['admin'] } },
  // Client Routes
  { path: 'client', children: [
    { path: 'dashboard', component: ClientDashboardComponent },
    { path: 'orders/:id', component: OrderDetailComponent },
    { path: 'profile', component: ProfileEditComponent }
  ]},
  // Public Routes
  { path: 'shop', component: ShopComponent },
  { path: 'products', redirectTo: 'shop', pathMatch: 'full' },
  { path: 'produits', redirectTo: 'shop', pathMatch: 'full' },
  { path: 'cart', component: CartComponent },
  { path: 'checkout', component: CheckoutComponent },
  { path: 'messages', component: MessagesComponent },
  { path: 'client-messages', component: ClientMessagesComponent },
  { path: 'contact', component: ContactComponent },
  // Auth
  { path: 'login', component: LoginComponent },
];
