import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { FooterComponent } from '../../src/app/components/footer/footer.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, FooterComponent],
  templateUrl: './shop-app.component.html',
  styleUrls: ['./shop-app.component.css']
})
export class ShopAppComponent {}
