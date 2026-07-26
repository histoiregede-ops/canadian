import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { APP_CONFIG, whatsappLink } from '../../services/app-config';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.css']
})
export class FooterComponent {
  currentYear = new Date().getFullYear();
  config = APP_CONFIG;

  socialLinks = [
    { name: 'WhatsApp', icon: '💬', url: `https://wa.me/${this.config.whatsapp}` },
    { name: 'Facebook', icon: '📘', url: '#' },
    { name: 'Instagram', icon: '📸', url: '#' },
    { name: 'Email', icon: '✉️', url: `mailto:${this.config.shop.email}` }
  ];

  services = [
    { label: 'Panneaux Solaires', link: whatsappLink("Bonjour, je suis intéressé par une installation solaire.") },
    { label: 'Électroménagers', link: whatsappLink("Bonjour, je cherche un électroménager.") },
    { label: 'Réparations', link: whatsappLink("Bonjour, j'ai besoin d'une réparation.") },
    { label: 'Accessoires', link: whatsappLink("Bonjour, je cherche des accessoires.") }
  ];
}
