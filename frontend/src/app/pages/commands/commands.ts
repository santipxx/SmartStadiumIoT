import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin, interval, Subscription } from 'rxjs';
import { finalize } from 'rxjs/operators';

import {
  CommandsService,
  CreateCommandPayload,
  DeviceCommand,
} from '../../services/commands';
import { Device, DevicesService } from '../../services/devices';
import {
  SensorConfig,
  SensorConfigsService,
} from '../../services/sensor-configs';
import {
  SimulatorStatus,
  TelemetryService,
} from '../../services/telemetry';

type MetricKey =
  | 'temperature'
  | 'humidity'
  | 'noise'
  | 'occupancy'
  | 'co2'
  | 'lightLevel'
  | 'peopleFlow'
  | 'energyConsumption'
  | 'voltage';

interface MetricDefinition {
  key: MetricKey;
  label: string;
  unit: string;
  defaultValue: number;
}

@Component({
  selector: 'app-commands',
  imports: [CommonModule, FormsModule],
  templateUrl: './commands.html',
  styleUrl: './commands.css',
})
export class Commands implements OnInit, OnDestroy {
  readonly metrics: MetricDefinition[] = [
    { key: 'temperature', label: 'Temperatura', unit: 'C', defaultValue: 28 },
    { key: 'humidity', label: 'Humedad', unit: '%', defaultValue: 70 },
    { key: 'noise', label: 'Ruido', unit: 'dB', defaultValue: 85 },
    { key: 'occupancy', label: 'Ocupacion', unit: '%', defaultValue: 60 },
    { key: 'co2', label: 'CO2', unit: 'ppm', defaultValue: 900 },
    { key: 'lightLevel', label: 'Iluminacion', unit: 'lux', defaultValue: 500 },
    { key: 'peopleFlow', label: 'Flujo de personas', unit: 'pers/min', defaultValue: 250 },
    { key: 'energyConsumption', label: 'Consumo energetico', unit: 'kWh', defaultValue: 300 },
    { key: 'voltage', label: 'Voltaje', unit: 'V', defaultValue: 120 },
  ];

  readonly commandLabels: Record<string, string> = {
    calibrate_sensor: 'Recalibracion',
    update_parameter: 'Cambio de parametro',
    pause_telemetry: 'Apagar envio',
    resume_telemetry: 'Reanudar envio',
    maintenance_mode: 'Modo mantenimiento',
    reset_sensor_config: 'Reiniciar configuracion',
  };

  devices: Device[] = [];
  commands: DeviceCommand[] = [];
  configs: SensorConfig[] = [];
  simulatorStatus: SimulatorStatus | null = null;
  selectedDeviceId = '';
  selectedMetric: MetricKey = 'temperature';
  parameterValue = 28;
  calibrationOffset = 0;
  intervalMs = 10000;
  notes = '';
  loading = true;
  saving = false;
  simulatorBusy = false;
  latestReadingPulse = false;
  lastStatusUpdatedAt: Date | null = null;
  error = '';
  success = '';

  private statusRefreshSubscription: Subscription | null = null;
  private readingPulseTimeout: number | null = null;

  constructor(
    private readonly commandsService: CommandsService,
    private readonly devicesService: DevicesService,
    private readonly sensorConfigsService: SensorConfigsService,
    private readonly telemetryService: TelemetryService,
  ) { }

  ngOnInit(): void {
    this.loadControlCenter();
    this.statusRefreshSubscription = interval(2000).subscribe(() => {
      this.refreshSimulatorStatus();
    });
  }

  ngOnDestroy(): void {
    this.statusRefreshSubscription?.unsubscribe();

    if (this.readingPulseTimeout) {
      window.clearTimeout(this.readingPulseTimeout);
    }
  }

  get selectedDevice(): Device | null {
    const id = Number(this.selectedDeviceId);

    return this.devices.find((device) => device.id === id) ?? null;
  }

  get selectedMetricDefinition(): MetricDefinition {
    return (
      this.metrics.find((metric) => metric.key === this.selectedMetric) ??
      this.metrics[0]
    );
  }

  get selectedConfig(): SensorConfig | null {
    const id = Number(this.selectedDeviceId);

    return this.configs.find((config) => config.deviceId === id) ?? null;
  }

  get selectedMetricOffset(): number | null {
    const value = this.selectedConfig?.calibrationOffsets?.[this.selectedMetric];

    return Number.isFinite(Number(value)) ? Number(value) : null;
  }

  get selectedMetricOverride(): number | null {
    const value = this.selectedConfig?.parameterOverrides?.[this.selectedMetric];

    return Number.isFinite(Number(value)) ? Number(value) : null;
  }

  get activeDevicesCount(): number {
    return this.devices.filter((device) => device.status === 'active').length;
  }

  get pausedDevicesCount(): number {
    return this.devices.filter((device) => device.status !== 'active').length;
  }

  get liveStatusText(): string {
    if (!this.simulatorStatus?.running) {
      return 'Sin envio automatico';
    }

    return `Transmitiendo cada ${Math.round(this.simulatorStatus.intervalMs / 1000)} s`;
  }

  get lastRunLabel(): string {
    if (!this.simulatorStatus?.lastRunAt) {
      return 'Sin envios todavia';
    }

    return this.relativeTimeLabel(this.simulatorStatus.lastRunAt);
  }

  get nextRunLabel(): string {
    if (!this.simulatorStatus?.running) {
      return 'No programado';
    }

    if (!this.simulatorStatus.lastRunAt) {
      return 'Preparando lote';
    }

    const lastRunAt = new Date(this.simulatorStatus.lastRunAt).getTime();
    const nextRunAt = lastRunAt + this.simulatorStatus.intervalMs;
    const remainingMs = Math.max(0, nextRunAt - Date.now());

    if (remainingMs < 1000) {
      return 'En cualquier momento';
    }

    return `~${Math.ceil(remainingMs / 1000)} s`;
  }

  get statusUpdatedLabel(): string {
    return this.lastStatusUpdatedAt
      ? this.relativeTimeLabel(this.lastStatusUpdatedAt.toISOString())
      : 'Esperando estado';
  }

  get commandHistory(): DeviceCommand[] {
    return this.commands.slice(0, 12);
  }

  get simulatorTargetLabel(): string {
    const targetIds = this.simulatorStatus?.targetDeviceIds;

    if (!targetIds?.length) {
      return 'Todos los dispositivos activos';
    }

    return targetIds
      .map((id) => this.deviceName(id))
      .join(', ');
  }

  loadControlCenter(): void {
    this.loading = true;
    this.error = '';

    forkJoin({
      devices: this.devicesService.getDevices(),
      commands: this.commandsService.getCommands(),
      configs: this.sensorConfigsService.getConfigs(),
      status: this.telemetryService.getSimulatorStatus(),
    })
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: ({ devices, commands, configs, status }) => {
          this.devices = devices;
          this.commands = commands;
          this.configs = configs;
          this.updateSimulatorStatus(status);

          if (!this.selectedDeviceId && devices.length) {
            this.selectedDeviceId = String(devices[0].id);
          }
        },
        error: () => {
          this.error =
            'No se pudo cargar el control de sensores. Revisa que el backend este activo.';
        },
      });
  }

  refreshSimulatorStatus(): void {
    if (this.loading) {
      return;
    }

    this.telemetryService.getSimulatorStatus().subscribe({
      next: (status) => {
        this.updateSimulatorStatus(status);
      },
      error: () => {
        this.error = 'No se pudo actualizar el estado del simulador.';
      },
    });
  }

  onMetricChange(): void {
    this.parameterValue = this.selectedMetricDefinition.defaultValue;
  }

  calibrateSensor(): void {
    const offset = Number(this.calibrationOffset);

    if (!Number.isFinite(offset)) {
      this.error = 'El ajuste de calibracion debe ser un numero valido.';
      return;
    }

    this.createCommand('calibrate_sensor', {
      metric: this.selectedMetric,
      offset,
      unit: this.selectedMetricDefinition.unit,
      notes: this.notes.trim(),
    });
  }

  updateParameter(): void {
    const value = Number(this.parameterValue);

    if (!Number.isFinite(value)) {
      this.error = 'El nuevo parametro debe ser un numero valido.';
      return;
    }

    this.createCommand('update_parameter', {
      metric: this.selectedMetric,
      value,
      unit: this.selectedMetricDefinition.unit,
      notes: this.notes.trim(),
    });
  }

  pauseTelemetry(): void {
    this.createCommand('pause_telemetry', {
      telemetry: false,
      reason: this.notes.trim() || 'Pausa manual desde control de sensores',
    });
  }

  resumeTelemetry(): void {
    this.createCommand('resume_telemetry', {
      telemetry: true,
      reason: this.notes.trim() || 'Reanudacion manual desde control de sensores',
    });
  }

  setMaintenanceMode(): void {
    this.createCommand('maintenance_mode', {
      status: 'maintenance',
      reason: this.notes.trim() || 'Revision y recalibracion programada',
    });
  }

  resetSensorConfig(): void {
    this.createCommand('reset_sensor_config', {
      notes: this.notes.trim() || 'Reinicio manual de calibracion y parametros',
    });
  }

  focusSimulatorOnDevice(): void {
    const device = this.requireSelectedDevice();

    if (!device) {
      return;
    }

    this.simulatorBusy = true;
    this.error = '';
    this.success = '';

    this.telemetryService
      .setSimulatorTargets([device.id])
      .pipe(finalize(() => (this.simulatorBusy = false)))
      .subscribe({
        next: (status) => {
          this.updateSimulatorStatus(status);
          this.success = `El simulador ahora envia datos solo a ${device.name}.`;
        },
        error: () => {
          this.error = 'No se pudo cambiar el objetivo de envio.';
        },
      });
  }

  clearSimulatorTargets(): void {
    this.simulatorBusy = true;
    this.error = '';
    this.success = '';

    this.telemetryService
      .clearSimulatorTargets()
      .pipe(finalize(() => (this.simulatorBusy = false)))
      .subscribe({
        next: (status) => {
          this.updateSimulatorStatus(status);
          this.success = 'El simulador vuelve a enviar datos a todos los sensores activos.';
        },
        error: () => {
          this.error = 'No se pudo limpiar el objetivo de envio.';
        },
      });
  }

  startSimulator(): void {
    this.simulatorBusy = true;
    this.error = '';
    this.success = '';

    this.telemetryService
      .startSimulator(this.intervalMs)
      .pipe(finalize(() => (this.simulatorBusy = false)))
      .subscribe({
        next: (status) => {
          this.updateSimulatorStatus(status);
          this.success = 'Envio de telemetria iniciado.';
        },
        error: () => {
          this.error = 'No se pudo iniciar el simulador.';
        },
      });
  }

  stopSimulator(): void {
    this.simulatorBusy = true;
    this.error = '';
    this.success = '';

    this.telemetryService
      .stopSimulator()
      .pipe(finalize(() => (this.simulatorBusy = false)))
      .subscribe({
        next: (status) => {
          this.updateSimulatorStatus(status);
          this.success = 'Envio de telemetria detenido.';
        },
        error: () => {
          this.error = 'No se pudo detener el simulador.';
        },
      });
  }

  sendBatch(): void {
    this.simulatorBusy = true;
    this.error = '';
    this.success = '';

    this.telemetryService
      .sendSimulatorBatch()
      .pipe(finalize(() => (this.simulatorBusy = false)))
      .subscribe({
        next: (status) => {
          this.updateSimulatorStatus(status);
          this.success = 'Muestra de telemetria generada.';
        },
        error: () => {
          this.error = 'No se pudo generar la muestra.';
        },
      });
  }

  statusClass(status: string): string {
    const classes: Record<string, string> = {
      active: 'text-bg-success',
      inactive: 'text-bg-secondary',
      maintenance: 'text-bg-warning',
    };

    return classes[status] ?? 'text-bg-light';
  }

  commandStatusClass(status: string): string {
    const classes: Record<string, string> = {
      executed: 'text-bg-success',
      pending: 'text-bg-warning',
      failed: 'text-bg-danger',
    };

    return classes[status] ?? 'text-bg-secondary';
  }

  commandLabel(command: string): string {
    return this.commandLabels[command] ?? command;
  }

  deviceName(deviceId: number): string {
    return (
      this.devices.find((device) => device.id === deviceId)?.name ??
      `Dispositivo ${deviceId}`
    );
  }

  formatCommandValue(value: string | null): string {
    if (!value) {
      return 'Sin parametros';
    }

    try {
      const parsed = JSON.parse(value) as Record<string, unknown>;
      const labels: Record<string, string> = {
        metric: 'Dato',
        offset: 'Ajuste',
        unit: 'Unidad',
        value: 'Valor',
        notes: 'Notas',
        reason: 'Motivo',
        telemetry: 'Telemetria',
        status: 'Estado',
      };

      return Object.entries(parsed)
        .filter(([key, itemValue]) => key !== 'notes' && itemValue !== '')
        .map(([key, itemValue]) => {
          const value =
            key === 'metric'
              ? this.metricLabel(String(itemValue))
              : String(itemValue);

          return `${labels[key] ?? key}: ${value}`;
        })
        .join(' | ');
    } catch {
      return value;
    }
  }

  metricLabel(metricKey: string): string {
    return (
      this.metrics.find((metric) => metric.key === metricKey)?.label ??
      metricKey
    );
  }

  formatDate(value: string): string {
    return new Intl.DateTimeFormat('es-CO', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(new Date(value));
  }

  trackDevice(_: number, device: Device): number {
    return device.id;
  }

  trackCommand(_: number, command: DeviceCommand): number {
    return command.id;
  }

  private createCommand(commandName: string, value: Record<string, unknown>): void {
    const device = this.requireSelectedDevice();

    if (!device) {
      return;
    }

    const payload: CreateCommandPayload = {
      deviceId: device.id,
      command: commandName,
      value,
    };

    this.saving = true;
    this.error = '';
    this.success = '';

    this.commandsService
      .createCommand(payload)
      .pipe(finalize(() => (this.saving = false)))
      .subscribe({
        next: () => {
          this.success = `${this.commandLabel(commandName)} aplicado a ${device.name}.`;
          this.loadControlCenter();
        },
        error: () => {
          this.error = 'No se pudo ejecutar el comando sobre el sensor.';
        },
      });
  }

  private requireSelectedDevice(): Device | null {
    const device = this.selectedDevice;

    if (!device) {
      this.error = 'Selecciona un sensor para continuar.';
      return null;
    }

    return device;
  }

  private updateSimulatorStatus(status: SimulatorStatus): void {
    const previousReadings = this.simulatorStatus?.totalReadings ?? 0;

    this.simulatorStatus = status;
    this.lastStatusUpdatedAt = new Date();

    if (status.totalReadings > previousReadings) {
      this.triggerReadingPulse();
    }
  }

  private triggerReadingPulse(): void {
    this.latestReadingPulse = true;

    if (this.readingPulseTimeout) {
      window.clearTimeout(this.readingPulseTimeout);
    }

    this.readingPulseTimeout = window.setTimeout(() => {
      this.latestReadingPulse = false;
    }, 900);
  }

  private relativeTimeLabel(value: string): string {
    const date = new Date(value);
    const seconds = Math.max(
      0,
      Math.floor((Date.now() - date.getTime()) / 1000),
    );

    if (seconds < 5) {
      return 'hace un momento';
    }

    if (seconds < 60) {
      return `hace ${seconds} s`;
    }

    const minutes = Math.floor(seconds / 60);

    if (minutes < 60) {
      return `hace ${minutes} min`;
    }

    return this.formatDate(value);
  }
}
