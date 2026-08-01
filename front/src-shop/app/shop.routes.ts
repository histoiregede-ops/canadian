import { Routes } from '@angular/router';

import { ShopComponent } from '../../src/app/pages/shop/shop.component';
import { CartComponent } from '../../src/app/pages/cart/cart.component';
import { CheckoutComponent } from '../../src/app/pages/checkout/checkout.component';
import { ContactComponent } from '../../src/app/pages/contact/contact.component';
import { ClientMessagesComponent } from '../../src/app/pages/client-messages/client-messages.component';
import { ClientDashboardComponent } from '../../src/app/pages/client-dashboard/client-dashboard.component';
import { OrderDetailComponent } from '../../src/app/pages/order-detail/order-detail.component';
import { ProfileEditComponent } from '../../src/app/pages/profile-edit/profile-edit.component';

import { ShopResolver } from '../../src/app/resolvers/shop.resolver';
import { ClientAuthGuard } from '../../src/app/services/client-auth.guard';

export const shopRoutes: Routes = [
  { path: '', redirectTo: 'shop', pathMatch: 'full' },
  { path: 'shop', component: ShopComponent, resolve: { data: ShopResolver } },
  { path: 'products', redirectTo: 'shop', pathMatch: 'full' },
  { path: 'produits', redirectTo: 'shop', pathMatch: 'full' },
  { path: 'cart', component: CartComponent },
  { path: 'checkout', component: CheckoutComponent },
  { path: 'contact', component: ContactComponent },
  { path: 'client-messages', component: ClientMessagesComponent, canActivate: [ClientAuthGuard] },
  {
    path: 'client',
    canActivate: [ClientAuthGuard],
    children: [
      { path: 'dashboard', component: ClientDashboardComponent },
      { path: 'orders/:id', component: OrderDetailComponent },
      { path: 'profile', component: ProfileEditComponent }
    ]
  },
  // Redirections indispensables : routes référencées par les composants du shop mais absentes de cette app
  { path: 'messages', redirectTo: 'client-messages', pathMatch: 'full' },
  { path: 'orders', redirectTo: 'client/dashboard', pathMatch: 'full' },
  { path: 'login', redirectTo: 'shop', pathMatch: 'full' },
  { path: '**', redirectTo: 'shop' }
];
