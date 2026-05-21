import { Component, HostListener } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { SidebarComponent } from './components/sidebar/sidebar.component';
import { NavbarComponent } from './components/navbar/navbar.component';
import { filter } from 'rxjs';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, CommonModule, SidebarComponent, NavbarComponent],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  isPublicPage = false;
  sidebarOpen = false;
  sidebarCollapsed = false;

  private sidebarHiddenRoutes = ['/login', '/contact', '/shop', '/cart', '/checkout', '/client-messages'];

  constructor(private router: Router) {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      this.isPublicPage = this.sidebarHiddenRoutes.some(route => event.url.startsWith(route));
      if (window.innerWidth <= 768) {
        this.closeSidebar();
      }
    });
  }

  toggleSidebar(): void {
    if (window.innerWidth <= 768) {
      this.sidebarOpen = !this.sidebarOpen;
    } else {
      this.sidebarCollapsed = !this.sidebarCollapsed;
    }
  }

  closeSidebar(): void {
    this.sidebarOpen = false;
  }

  @HostListener('window:resize')
  onResize(): void {
    if (window.innerWidth > 768) {
      this.sidebarOpen = false;
    }
  }
}
