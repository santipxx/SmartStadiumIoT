import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-login',
  imports: [CommonModule, FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login implements OnInit {
  username = 'admin';
  password = '';
  error = '';

  constructor(
    private readonly authService: AuthService,
    private readonly router: Router,
  ) { }

  ngOnInit(): void {
    if (this.authService.isLoggedIn()) {
      void this.router.navigateByUrl('/');
    }
  }

  login(): void {
    this.error = '';

    if (this.authService.login(this.username, this.password)) {
      void this.router.navigateByUrl('/');
      return;
    }

    this.error = 'Credenciales invalidas. Usa admin / admin123.';
  }
}
