import { Routes } from '@angular/router';
import { RoleGuard } from './services/role.guard';
import { ClientAuthGuard } from './services/client-auth.guard';

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
import { PayrollResolver } from './resolvers/payroll.resolver';
import { ReportsResolver } from './resolvers/reports.resolver';
import { ShopResolver } from './resolvers/shop.resolver';
import { UserManagementResolver } from './resolvers/user-management.resolver';
import { MovementsResolver } from './resolvers/movements.resolver';
import { TransfersResolver } from './resolvers/transfers.resolver';
import { ReceiptsResolver } from './resolvers/receipts.resolver';
import { PurchaseOrdersResolver } from './resolvers/purchase-orders.resolver';

export const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: 'admin', redirectTo: 'dashboard', pathMatch: 'full' },
  // Admin / Internal Routes - LAZY LOADED
  { path: 'dashboard', loadComponent: () => import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent), canActivate: [RoleGuard], resolve: { data: DashboardResolver }, data: { roles: ['admin', 'cashier'] } },
  { path: 'inventory', loadComponent: () => import('./pages/inventory/inventory.component').then(m => m.InventoryComponent), canActivate: [RoleGuard], resolve: { data: InventoryResolver }, data: { roles: ['admin', 'cashier'] } },
  { path: 'suppliers', loadComponent: () => import('./pages/suppliers/suppliers.component').then(m => m.SuppliersComponent), canActivate: [RoleGuard], resolve: { data: SuppliersResolver }, data: { roles: ['admin', 'cashier'] } },
  { path: 'categories', loadComponent: () => import('./pages/categories/categories.component').then(m => m.CategoriesComponent), canActivate: [RoleGuard], resolve: { data: CategoriesResolver }, data: { roles: ['admin'] } },
  { path: 'scan', loadComponent: () => import('./pages/scan/scan.component').then(m => m.ScanComponent), canActivate: [RoleGuard], resolve: { data: ScanResolver }, data: { roles: ['admin', 'cashier'] } },
  { path: 'sales', loadComponent: () => import('./pages/sales/sales.component').then(m => m.SalesComponent), canActivate: [RoleGuard], resolve: { data: SalesResolver }, data: { roles: ['admin', 'cashier'] } },
  { path: 'repairs', loadComponent: () => import('./pages/repairs/repairs.component').then(m => m.RepairsComponent), canActivate: [RoleGuard], resolve: { data: RepairsResolver }, data: { roles: ['admin', 'technician'] } },
  { path: 'installations', loadComponent: () => import('./pages/installations/installations.component').then(m => m.InstallationsComponent), canActivate: [RoleGuard], resolve: { data: InstallationsResolver }, data: { roles: ['admin', 'technician'] } },
  { path: 'customers', loadComponent: () => import('./pages/customers/customers.component').then(m => m.CustomersComponent), canActivate: [RoleGuard], resolve: { data: CustomersResolver }, data: { roles: ['admin', 'cashier'] } },
  { path: 'technicians', loadComponent: () => import('./pages/technicians/technicians.component').then(m => m.TechniciansComponent), canActivate: [RoleGuard], resolve: { data: TechniciansResolver }, data: { roles: ['admin'] } },
  { path: 'finance', loadComponent: () => import('./pages/finance/finance.component').then(m => m.FinanceComponent), canActivate: [RoleGuard], resolve: { data: FinanceResolver }, data: { roles: ['admin'] } },
  { path: 'reports', loadComponent: () => import('./pages/reports/reports.component').then(m => m.ReportsComponent), canActivate: [RoleGuard], resolve: { data: ReportsResolver }, data: { roles: ['admin'] } },
  { path: 'settings', loadComponent: () => import('./pages/settings/settings.component').then(m => m.SettingsComponent), canActivate: [RoleGuard], data: { roles: ['admin'] } },
  { path: 'users', loadComponent: () => import('./pages/user-management/user-management.component').then(m => m.UserManagementComponent), canActivate: [RoleGuard], resolve: { data: UserManagementResolver }, data: { roles: ['admin'] } },
  { path: 'movements', loadComponent: () => import('./pages/movements/movements.component').then(m => m.MovementsComponent), canActivate: [RoleGuard], resolve: { data: MovementsResolver }, data: { roles: ['admin', 'cashier'] } },
  { path: 'receipts', loadComponent: () => import('./pages/receipts/receipts.component').then(m => m.ReceiptsComponent), canActivate: [RoleGuard], resolve: { data: ReceiptsResolver }, data: { roles: ['admin', 'cashier'] } },
  { path: 'purchase-orders', loadComponent: () => import('./pages/purchase-orders/purchase-orders.component').then(m => m.PurchaseOrdersComponent), canActivate: [RoleGuard], resolve: { data: PurchaseOrdersResolver }, data: { roles: ['admin'] } },
  { path: 'transfers', loadComponent: () => import('./pages/transfers/transfers.component').then(m => m.TransfersComponent), canActivate: [RoleGuard], resolve: { data: TransfersResolver }, data: { roles: ['admin', 'cashier'] } },
  { path: 'audit', loadComponent: () => import('./pages/audit/audit.component').then(m => m.AuditComponent), canActivate: [RoleGuard], data: { roles: ['admin'] } },
  { path: 'monitoring', loadComponent: () => import('./pages/monitoring/monitoring.component').then(m => m.MonitoringComponent), canActivate: [RoleGuard], data: { roles: ['admin'] } },
  { path: 'accounting', loadComponent: () => import('./pages/accounting/accounting.component').then(m => m.AccountingComponent), canActivate: [RoleGuard], resolve: { data: FinanceResolver }, data: { roles: ['admin', 'cashier'] } },
  { path: 'payroll', loadComponent: () => import('./pages/payroll/payroll.component').then(m => m.PayrollComponent), canActivate: [RoleGuard], resolve: { data: PayrollResolver }, data: { roles: ['admin'] } },
  { path: 'admin-panel', loadComponent: () => import('./pages/admin-panel/admin-panel.component').then(m => m.AdminPanelComponent), canActivate: [RoleGuard], data: { roles: ['admin'] } },
  // Client Routes - LAZY
  { path: 'client', canActivate: [ClientAuthGuard], children: [
    { path: 'dashboard', loadComponent: () => import('./pages/client-dashboard/client-dashboard.component').then(m => m.ClientDashboardComponent) },
    { path: 'orders/:id', loadComponent: () => import('./pages/order-detail/order-detail.component').then(m => m.OrderDetailComponent) },
    { path: 'profile', loadComponent: () => import('./pages/profile-edit/profile-edit.component').then(m => m.ProfileEditComponent) }
  ]},
  // Public Routes - LAZY
  { path: 'shop', loadComponent: () => import('./pages/shop/shop.component').then(m => m.ShopComponent), resolve: { data: ShopResolver } },
  { path: 'products', redirectTo: 'shop', pathMatch: 'full' },
  { path: 'produits', redirectTo: 'shop', pathMatch: 'full' },
  { path: 'cart', loadComponent: () => import('./pages/cart/cart.component').then(m => m.CartComponent) },
  { path: 'checkout', loadComponent: () => import('./pages/checkout/checkout.component').then(m => m.CheckoutComponent) },
  { path: 'messages', loadComponent: () => import('./pages/messages/messages.component').then(m => m.MessagesComponent) },
  { path: 'client-messages', loadComponent: () => import('./pages/client-messages/client-messages.component').then(m => m.ClientMessagesComponent), canActivate: [ClientAuthGuard] },
  { path: 'contact', loadComponent: () => import('./pages/contact/contact.component').then(m => m.ContactComponent) },
  // Auth - LAZY
  { path: 'login', loadComponent: () => import('./pages/login/login.component').then(m => m.LoginComponent) },
];
