import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { Device } from './devices';

export interface AlertEvent {
  id: number;
  deviceId: number;
  device?: Device;
  alertType: string;
  message: string;
  severity: string;
  createdAt: string;
}

export interface AlertRule {
  id: number;
  deviceId: number | null;
  device?: Device | null;
  name: string;
  metric: string;
  operator: string;
  threshold: number | string;
  severity: string;
  enabled: boolean;
  createdAt: string;
}

export interface CreateAlertRulePayload {
  deviceId: number | null;
  name: string;
  metric: string;
  operator: string;
  threshold: number;
  severity: string;
  enabled: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class AlertsService {
  private readonly apiUrl = 'http://localhost:3000/alerts';

  constructor(private readonly http: HttpClient) { }

  getAlerts(): Observable<AlertEvent[]> {
    return this.http.get<AlertEvent[]>(this.apiUrl);
  }

  getRules(): Observable<AlertRule[]> {
    return this.http.get<AlertRule[]>(`${this.apiUrl}/rules`);
  }

  createRule(payload: CreateAlertRulePayload): Observable<AlertRule> {
    return this.http.post<AlertRule>(`${this.apiUrl}/rules`, payload);
  }

  updateRule(
    id: number,
    payload: Partial<CreateAlertRulePayload>,
  ): Observable<AlertRule> {
    return this.http.patch<AlertRule>(`${this.apiUrl}/rules/${id}`, payload);
  }

  deleteRule(id: number): Observable<{ deleted: boolean; id: number }> {
    return this.http.delete<{ deleted: boolean; id: number }>(
      `${this.apiUrl}/rules/${id}`,
    );
  }
}
