import { Component, Output, EventEmitter } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  providers: [DatePipe],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css']
})
export class NavbarComponent {
  @Output() toggleSidebar = new EventEmitter<void>();
  today: Date = new Date();

  onToggle(): void {
    this.toggleSidebar.emit();
  }
}
