import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { Device } from './devices';

export interface SensorConfig {
  id: number;
  deviceId: number;
  device?: Device;
  calibrationOffsets: Record<string, number>;
  parameterOverrides: Record<string, number>;
  lastNotes: string | null;
  updatedAt: string;
}

@Injectable({
  providedIn: 'root',
})
export class SensorConfigsService {
  private readonly apiUrl = 'http://localhost:3000/sensor-configs';

  constructor(private readonly http: HttpClient) { }

  getConfigs(): Observable<SensorConfig[]> {
    return this.http.get<SensorConfig[]>(this.apiUrl);
  }

  getDeviceConfig(deviceId: number): Observable<SensorConfig | null> {
    return this.http.get<SensorConfig | null>(`${this.apiUrl}/device/${deviceId}`);
  }
}
