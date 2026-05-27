import { Routes } from '@angular/router';

import { Dashboard } from './pages/dashboard/dashboard';
import { Devices } from './pages/devices/devices';
import { Alerts } from './pages/alerts/alerts';
import { Commands } from './pages/commands/commands';
import { AiAssistant } from './pages/ai-assistant/ai-assistant';
import { Login } from './pages/login/login';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
    {
        path: 'login',
        component: Login,
    },
    {
        path: '',
        component: Dashboard,
        canActivate: [authGuard],
    },
    {
        path: 'devices',
        component: Devices,
        canActivate: [authGuard],
    },
    {
        path: 'alerts',
        component: Alerts,
        canActivate: [authGuard],
    },
    {
        path: 'commands',
        component: Commands,
        canActivate: [authGuard],
    },
    {
        path: 'ai-assistant',
        component: AiAssistant,
        canActivate: [authGuard],
    },
    {
        path: '**',
        redirectTo: '',
    },
];
