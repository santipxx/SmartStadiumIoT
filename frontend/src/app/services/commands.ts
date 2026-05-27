import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { Device } from './devices';

export interface DeviceCommand {
  id: number;
  deviceId: number;
  device?: Device;
  command: string;
  value: string | null;
  status: string;
  createdAt: string;
}

export interface CreateCommandPayload {
  deviceId: number;
  command: string;
  value?: unknown;
  status?: string;
}

@Injectable({
  providedIn: 'root',
})
export class CommandsService {
  private readonly apiUrl = 'http://localhost:3000/commands';

  constructor(private readonly http: HttpClient) { }

  getCommands(): Observable<DeviceCommand[]> {
    return this.http.get<DeviceCommand[]>(this.apiUrl);
  }

  getDeviceCommands(deviceId: number): Observable<DeviceCommand[]> {
    return this.http.get<DeviceCommand[]>(`${this.apiUrl}/device/${deviceId}`);
  }

  createCommand(payload: CreateCommandPayload): Observable<DeviceCommand> {
    return this.http.post<DeviceCommand>(this.apiUrl, payload);
  }

  updateCommandStatus(id: number, status: string): Observable<DeviceCommand> {
    return this.http.patch<DeviceCommand>(`${this.apiUrl}/${id}/status`, {
      status,
    });
  }
}
