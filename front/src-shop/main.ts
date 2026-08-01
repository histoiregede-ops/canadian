import '@angular/compiler';
import { bootstrapApplication } from '@angular/platform-browser';
import { shopConfig } from './app/shop.config';
import { ShopAppComponent } from './app/shop-app.component';

bootstrapApplication(ShopAppComponent, shopConfig)
  .catch((err) => console.error(err));
