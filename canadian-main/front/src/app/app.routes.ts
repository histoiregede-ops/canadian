import { Routes } from '@angular/router';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { SuppliersComponent } from './pages/suppliers/suppliers.component';
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
import { HomeRedirectComponent } from './pages/home-redirect/home-redirect.component';
import { ClientAuthGuard } from './services/client-auth.guard';
import { ScanComponent } from './pages/scan/scan.component';
import { MovementsComponent } from './pages/movements/movements.component';

import { DashboardResolver } from './resolvers/dashboard.resolver';
import { InventoryResolver } from './resolvers/inventory.resolver';
import { SuppliersResolver } from './resolvers/suppliers.resolver';
import { CategoriesResolver } from './resolvers/categories.resolver';
import { ScanResolver } from './resolvers/scan.resolver';
import { SalesResolver } from './resolvers/sales.resolver';
import { RepairsResolver } from './resolvers/repairs.resolver';
import { InstallationsResolver } from './resolvers/installations.resolver';
import { CustomersResolver } from './resolvers/customers.resolver';
import { TechniciansResolver } from './resolvers/technicians.resolver';
import { FinanceResolver } from './resolvers/finance.resolver';
import { ReportsResolver } from './resolvers/reports.resolver';
import { ShopResolver } from './resolvers/shop.resolver';
import { UserManagementResolver } from './resolvers/user-management.resolver';
import { MovementsResolver } from './resolvers/movements.resolver';

export const routes: Routes = [
  { path: '', component: HomeRedirectComponent },
  { path: 'admin', redirectTo: 'dashboard', pathMatch: 'full' },
  // Admin / Internal Routes
  { path: 'dashboard', component: DashboardComponent, canActivate: [RoleGuard], resolve: { data: DashboardResolver }, data: { roles: ['admin', 'cashier'] } },
  { path: 'inventory', component: InventoryComponent, canActivate: [RoleGuard], resolve: { data: InventoryResolver }, data: { roles: ['admin', 'cashier'] } },
  { path: 'suppliers', component: SuppliersComponent, canActivate: [RoleGuard], resolve: { data: SuppliersResolver }, data: { roles: ['admin', 'cashier'] } },
  { path: 'categories', component: CategoriesComponent, canActivate: [RoleGuard], resolve: { data: CategoriesResolver }, data: { roles: ['admin'] } },
  { path: 'scan', component: ScanComponent, canActivate: [RoleGuard], resolve: { data: ScanResolver }, data: { roles: ['admin', 'cashier'] } },
  { path: 'sales', component: SalesComponent, canActivate: [RoleGuard], resolve: { data: SalesResolver }, data: { roles: ['admin', 'cashier'] } },
  { path: 'repairs', component: RepairsComponent, canActivate: [RoleGuard], resolve: { data: RepairsResolver }, data: { roles: ['admin', 'technician'] } },
  { path: 'installations', component: InstallationsComponent, canActivate: [RoleGuard], resolve: { data: InstallationsResolver }, data: { roles: ['admin', 'technician'] } },
  { path: 'customers', component: CustomersComponent, canActivate: [RoleGuard], resolve: { data: CustomersResolver }, data: { roles: ['admin', 'cashier'] } },
  { path: 'technicians', component: TechniciansComponent, canActivate: [RoleGuard], resolve: { data: TechniciansResolver }, data: { roles: ['admin'] } },
  { path: 'finance', component: FinanceComponent, canActivate: [RoleGuard], resolve: { data: FinanceResolver }, data: { roles: ['admin'] } },
  { path: 'reports', component: ReportsComponent, canActivate: [RoleGuard], resolve: { data: ReportsResolver }, data: { roles: ['admin'] } },
  { path: 'settings', component: SettingsComponent, canActivate: [RoleGuard], data: { roles: ['admin'] } },
  { path: 'users', component: UserManagementComponent, canActivate: [RoleGuard], resolve: { data: UserManagementResolver }, data: { roles: ['admin'] } },
  { path: 'movements', component: MovementsComponent, canActivate: [RoleGuard], resolve: { data: MovementsResolver }, data: { roles: ['admin', 'cashier'] } },
  // Client Routes
  { path: 'client', canActivate: [ClientAuthGuard], children: [
    { path: 'dashboard', component: ClientDashboardComponent },
    { path: 'orders/:id', component: OrderDetailComponent },
    { path: 'profile', component: ProfileEditComponent }
  ]},
  // Public Routes
  { path: 'shop', component: ShopComponent, resolve: { data: ShopResolver } },
  { path: 'products', redirectTo: 'shop', pathMatch: 'full' },
  { path: 'produits', redirectTo: 'shop', pathMatch: 'full' },
  { path: 'cart', component: CartComponent },
  { path: 'checkout', component: CheckoutComponent },
  { path: 'messages', component: MessagesComponent },
  { path: 'client-messages', component: ClientMessagesComponent, canActivate: [ClientAuthGuard] },
  { path: 'contact', component: ContactComponent },
  // Auth
  { path: 'login', component: LoginComponent },
];
