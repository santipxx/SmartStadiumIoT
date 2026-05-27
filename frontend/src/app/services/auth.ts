import { Injectable } from '@angular/core';

export interface AuthUser {
  username: string;
  name: string;
  role: string;
}

interface DemoUser extends AuthUser {
  password: string;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly storageKey = 'smart-stadium-session';
  private readonly demoUsers: DemoUser[] = [
    {
      username: 'admin',
      password: 'admin123',
      name: 'Administrador IoT',
      role: 'Operador',
    },
    {
      username: 'iot',
      password: 'montanini',
      name: 'Proyecto Montanini',
      role: 'Analista',
    },
  ];

  login(username: string, password: string): boolean {
    const user = this.demoUsers.find(
      (item) =>
        item.username.toLowerCase() === username.trim().toLowerCase() &&
        item.password === password,
    );

    if (!user || !this.hasStorage()) {
      return false;
    }

    const session: AuthUser = {
      username: user.username,
      name: user.name,
      role: user.role,
    };

    localStorage.setItem(this.storageKey, JSON.stringify(session));

    return true;
  }

  logout(): void {
    if (this.hasStorage()) {
      localStorage.removeItem(this.storageKey);
    }
  }

  isLoggedIn(): boolean {
    return this.currentUser !== null;
  }

  get currentUser(): AuthUser | null {
    if (!this.hasStorage()) {
      return null;
    }

    const rawSession = localStorage.getItem(this.storageKey);

    if (!rawSession) {
      return null;
    }

    try {
      return JSON.parse(rawSession) as AuthUser;
    } catch {
      localStorage.removeItem(this.storageKey);
      return null;
    }
  }

  private hasStorage(): boolean {
    return typeof localStorage !== 'undefined';
  }
}
