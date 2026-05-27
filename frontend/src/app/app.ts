import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterOutlet } from '@angular/router';
import { Router } from '@angular/router';

import { AuthService } from './services/auth';

@Component({
  selector: 'app-root',
  imports: [CommonModule, RouterOutlet, RouterLink],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected title = 'frontend';

  constructor(
    protected readonly authService: AuthService,
    private readonly router: Router,
  ) { }

  get isLoggedIn(): boolean {
    return this.authService.isLoggedIn();
  }

  logout(): void {
    this.authService.logout();
    void this.router.navigateByUrl('/login');
  }
}
