import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Device } from '../devices/device.entity';
import { SensorConfig } from '../sensor-configs/sensor-config.entity';
import { SensorConfigsService } from '../sensor-configs/sensor-configs.service';
import { TelemetryService } from '../telemetry/telemetry.service';

export interface SimulatorStatus {
  running: boolean;
  intervalMs: number;
  lastRunAt: Date | null;
  totalBatches: number;
  totalReadings: number;
  lastError: string | null;
  targetDeviceIds: number[] | null;
}

@Injectable()
export class SimulatorService implements OnModuleDestroy {
  private readonly defaultIntervalMs = 10000;
  private intervalRef: ReturnType<typeof setInterval> | null = null;
  private intervalMs = this.defaultIntervalMs;
  private running = false;
  private sending = false;
  private lastRunAt: Date | null = null;
  private totalBatches = 0;
  private totalReadings = 0;
  private lastError: string | null = null;
  private targetDeviceIds: number[] | null = null;

  constructor(
    @InjectRepository(Device)
    private readonly devicesRepository: Repository<Device>,
    private readonly sensorConfigsService: SensorConfigsService,
    private readonly telemetryService: TelemetryService,
  ) { }

  onModuleDestroy() {
    this.stop();
  }

  start(intervalMs?: number): SimulatorStatus {
    this.intervalMs = this.normalizeInterval(intervalMs);
    this.stopInterval();
    this.running = true;
    this.intervalRef = setInterval(() => void this.sendBatch(), this.intervalMs);
    void this.sendBatch();

    return this.getStatus();
  }

  stop(): SimulatorStatus {
    this.stopInterval();
    this.running = false;

    return this.getStatus();
  }

  getStatus(): SimulatorStatus {
    return {
      running: this.running,
      intervalMs: this.intervalMs,
      lastRunAt: this.lastRunAt,
      totalBatches: this.totalBatches,
      totalReadings: this.totalReadings,
      lastError: this.lastError,
      targetDeviceIds: this.targetDeviceIds,
    };
  }

  setTargets(deviceIds: number[]): SimulatorStatus {
    const normalizedIds = Array.from(
      new Set(
        (deviceIds ?? [])
          .map((id) => Number(id))
          .filter((id) => Number.isInteger(id) && id > 0),
      ),
    );

    this.targetDeviceIds = normalizedIds.length ? normalizedIds : null;

    return this.getStatus();
  }

  clearTargets(): SimulatorStatus {
    this.targetDeviceIds = null;

    return this.getStatus();
  }

  async sendBatchNow(): Promise<SimulatorStatus> {
    await this.sendBatch();

    return this.getStatus();
  }

  private stopInterval() {
    if (this.intervalRef) {
      clearInterval(this.intervalRef);
      this.intervalRef = null;
    }
  }

  private normalizeInterval(intervalMs?: number): number {
    if (!intervalMs || Number.isNaN(intervalMs)) {
      return this.defaultIntervalMs;
    }

    return Math.max(3000, Math.min(intervalMs, 60000));
  }

  private async sendBatch() {
    if (this.sending) {
      return;
    }

    this.sending = true;

    try {
      let devices = await this.devicesRepository.find({
        where: { status: 'active' },
        order: { id: 'ASC' },
      });

      if (this.targetDeviceIds?.length) {
        const targetIds = new Set(this.targetDeviceIds);
        devices = devices.filter((device) => targetIds.has(device.id));
      }

      const configMap = await this.sensorConfigsService.findMapByDevices(
        devices.map((device) => device.id),
      );

      for (const device of devices) {
        await this.telemetryService.create(
          this.generateTelemetry(device, configMap.get(device.id)),
        );
      }

      this.totalBatches += 1;
      this.totalReadings += devices.length;
      this.lastRunAt = new Date();
      this.lastError = devices.length
        ? null
        : this.targetDeviceIds?.length
          ? 'No hay dispositivos activos dentro del objetivo seleccionado.'
          : 'No hay dispositivos activos para simular.';
    } catch (error) {
      this.lastError =
        error instanceof Error
          ? error.message
          : 'No se pudo generar telemetria.';
    } finally {
      this.sending = false;
    }
  }

  private generateTelemetry(device: Device, config?: SensorConfig) {
    const base = {
      deviceId: device.id,
      temperature: this.random(24, 36),
      humidity: this.random(45, 85),
      noise: this.random(60, 115),
      occupancy: this.random(10, 98),
      co2: this.random(400, 1400),
      lightLevel: this.random(200, 1000),
      peopleFlow: this.randomInt(0, 650),
      energyConsumption: this.random(80, 580),
      voltage: this.random(108, 130),
      doorStatus: Math.random() > 0.72 ? 'open' : 'closed',
    };

    if (this.isEnergyDevice(device)) {
      return this.applySensorConfig({
        ...base,
        temperature: null,
        humidity: null,
        noise: null,
        occupancy: null,
        co2: null,
        lightLevel: null,
        peopleFlow: null,
        doorStatus: null,
      }, config);
    }

    if (this.isAccessDevice(device)) {
      return this.applySensorConfig({
        ...base,
        co2: null,
        energyConsumption: null,
        voltage: null,
      }, config);
    }

    return this.applySensorConfig(base, config);
  }

  private applySensorConfig(
    telemetry: Record<string, number | string | null>,
    config?: SensorConfig,
  ) {
    if (!config) {
      return telemetry;
    }

    const offsets = config.calibrationOffsets ?? {};
    const overrides = config.parameterOverrides ?? {};
    const numericMetrics = [
      'temperature',
      'humidity',
      'noise',
      'occupancy',
      'co2',
      'lightLevel',
      'peopleFlow',
      'energyConsumption',
      'voltage',
    ];

    for (const metric of numericMetrics) {
      if (telemetry[metric] === null || telemetry[metric] === undefined) {
        continue;
      }

      let value = Number(telemetry[metric]);

      if (Number.isFinite(Number(overrides[metric]))) {
        value = this.randomAround(Number(overrides[metric]), metric);
      }

      if (Number.isFinite(Number(offsets[metric]))) {
        value += Number(offsets[metric]);
      }

      telemetry[metric] = this.normalizeMetricValue(metric, value);
    }

    return telemetry;
  }

  private isEnergyDevice(device: Device): boolean {
    return this.deviceSearchText(device).includes('energia');
  }

  private isAccessDevice(device: Device): boolean {
    const text = this.deviceSearchText(device);

    return text.includes('acceso') || text.includes('puerta');
  }

  private deviceSearchText(device: Device): string {
    return `${device.name} ${device.zone} ${device.deviceType}`
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  private random(min: number, max: number): number {
    return Number((Math.random() * (max - min) + min).toFixed(2));
  }

  private randomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  private randomAround(value: number, metric: string): number {
    const spreads: Record<string, number> = {
      temperature: 1.2,
      humidity: 3,
      noise: 5,
      occupancy: 5,
      co2: 70,
      lightLevel: 60,
      peopleFlow: 35,
      energyConsumption: 25,
      voltage: 2,
    };

    const spread = spreads[metric] ?? 1;

    return this.random(value - spread, value + spread);
  }

  private normalizeMetricValue(metric: string, value: number): number {
    const limits: Record<string, { min: number; max: number }> = {
      temperature: { min: 0, max: 60 },
      humidity: { min: 0, max: 100 },
      noise: { min: 0, max: 140 },
      occupancy: { min: 0, max: 100 },
      co2: { min: 300, max: 2000 },
      lightLevel: { min: 0, max: 1500 },
      peopleFlow: { min: 0, max: 900 },
      energyConsumption: { min: 0, max: 900 },
      voltage: { min: 90, max: 140 },
    };
    const limit = limits[metric];
    const clampedValue = limit
      ? Math.max(limit.min, Math.min(value, limit.max))
      : value;

    if (metric === 'peopleFlow') {
      return Math.round(clampedValue);
    }

    return Number(clampedValue.toFixed(2));
  }
}
