import { Component, HostListener, OnInit } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd, NavigationStart } from '@angular/router';
import { CommonModule } from '@angular/common';
import { SidebarComponent } from './components/sidebar/sidebar.component';
import { NavbarComponent } from './components/navbar/navbar.component';
import { FooterComponent } from './components/footer/footer.component';
import { filter } from 'rxjs';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, CommonModule, SidebarComponent, NavbarComponent, FooterComponent],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  isPublicPage = false;
  isLoginPage = false;
  sidebarOpen = false;
  sidebarCollapsed = false;

  private sidebarHiddenRoutes = ['/login', '/contact', '/shop', '/cart', '/checkout', '/client-messages', '/client'];

  constructor(private router: Router) {
    this.checkPublicRoute(this.router.url);
    this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd || event instanceof NavigationStart) {
        const url = (event as any).urlAfterRedirects || (event as any).url || this.router.url;
        this.checkPublicRoute(url);
        if (window.innerWidth <= 768) {
          this.closeSidebar();
        }
      }
    });
  }

  ngOnInit(): void {
    this.checkPublicRoute(this.router.url);
  }

  private checkPublicRoute(url: string): void {
    const cleanUrl = url.split('?')[0].split('#')[0];
    this.isPublicPage = this.sidebarHiddenRoutes.some(route => cleanUrl.startsWith(route));
    this.isLoginPage = cleanUrl.startsWith('/login');
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