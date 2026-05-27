import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { API_BASE_URL } from './api-config';
import { Device } from './devices';

export interface TelemetryReading {
  id: number;
  deviceId: number;
  device?: Device;
  temperature: number | string | null;
  humidity: number | string | null;
  noise: number | string | null;
  occupancy: number | string | null;
  co2: number | string | null;
  lightLevel: number | string | null;
  peopleFlow: number | string | null;
  energyConsumption: number | string | null;
  voltage: number | string | null;
  doorStatus: string | null;
  createdAt: string;
}

export interface SimulatorStatus {
  running: boolean;
  intervalMs: number;
  lastRunAt: string | null;
  totalBatches: number;
  totalReadings: number;
  lastError: string | null;
  targetDeviceIds: number[] | null;
}

@Injectable({
  providedIn: 'root',
})
export class TelemetryService {
  private readonly apiUrl = API_BASE_URL;

  constructor(private readonly http: HttpClient) { }

  getTelemetry(): Observable<TelemetryReading[]> {
    return this.http.get<TelemetryReading[]>(`${this.apiUrl}/telemetry`);
  }

  getDeviceTelemetry(deviceId: number): Observable<TelemetryReading[]> {
    return this.http.get<TelemetryReading[]>(
      `${this.apiUrl}/telemetry/device/${deviceId}`,
    );
  }

  getSimulatorStatus(): Observable<SimulatorStatus> {
    return this.http.get<SimulatorStatus>(`${this.apiUrl}/simulator/status`);
  }

  startSimulator(intervalMs: number): Observable<SimulatorStatus> {
    return this.http.post<SimulatorStatus>(`${this.apiUrl}/simulator/start`, {
      intervalMs,
    });
  }

  stopSimulator(): Observable<SimulatorStatus> {
    return this.http.post<SimulatorStatus>(`${this.apiUrl}/simulator/stop`, {});
  }

  sendSimulatorBatch(): Observable<SimulatorStatus> {
    return this.http.post<SimulatorStatus>(`${this.apiUrl}/simulator/tick`, {});
  }

  setSimulatorTargets(deviceIds: number[]): Observable<SimulatorStatus> {
    return this.http.post<SimulatorStatus>(`${this.apiUrl}/simulator/targets`, {
      deviceIds,
    });
  }

  clearSimulatorTargets(): Observable<SimulatorStatus> {
    return this.http.delete<SimulatorStatus>(`${this.apiUrl}/simulator/targets`);
  }
}
