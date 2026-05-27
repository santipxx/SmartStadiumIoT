import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

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
  private apiUrl = 'http://localhost:3000/devices';

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
