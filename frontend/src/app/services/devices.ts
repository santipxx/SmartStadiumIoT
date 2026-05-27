import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { API_BASE_URL } from './api-config';

export interface Device {
  id: number;
  deviceCode: string;
  name: string;
  zone: string;
  deviceType: string;
  status: string;
  createdAt: string;
}

@Injectable({
  providedIn: 'root',
})
export class DevicesService {
  private apiUrl = `${API_BASE_URL}/devices`;

  constructor(private http: HttpClient) { }

  getDevices(): Observable<Device[]> {
    return this.http.get<Device[]>(this.apiUrl);
  }

  updateStatus(deviceId: number, status: string): Observable<Device> {
    return this.http.patch<Device>(`${this.apiUrl}/${deviceId}/status`, {
      status,
    });
  }
}
