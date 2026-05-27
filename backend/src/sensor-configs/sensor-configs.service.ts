import {
  BadRequestException,
  Injectable,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';

import { SensorConfig } from './sensor-config.entity';

interface MetricLimit {
  min: number;
  max: number;
}

@Injectable()
export class SensorConfigsService implements OnModuleInit {
  private readonly metricLimits: Record<string, MetricLimit> = {
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

  constructor(
    @InjectRepository(SensorConfig)
    private readonly sensorConfigsRepository: Repository<SensorConfig>,
    private readonly dataSource: DataSource,
  ) { }

  async onModuleInit() {
    await this.dataSource.query(`
      CREATE TABLE IF NOT EXISTS sensor_configs (
        id SERIAL PRIMARY KEY,
        device_id INTEGER NOT NULL UNIQUE REFERENCES devices(id) ON DELETE CASCADE,
        calibration_offsets JSONB NOT NULL DEFAULT '{}'::jsonb,
        parameter_overrides JSONB NOT NULL DEFAULT '{}'::jsonb,
        last_notes TEXT NULL,
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);
  }

  findAll() {
    return this.sensorConfigsRepository.find({
      relations: ['device'],
      order: {
        updatedAt: 'DESC',
      },
    });
  }

  findByDevice(deviceId: number) {
    return this.sensorConfigsRepository.findOne({
      where: { deviceId },
      relations: ['device'],
    });
  }

  async findMapByDevices(deviceIds: number[]) {
    const configs = await this.sensorConfigsRepository.find({
      where: {
        deviceId: In(deviceIds),
      },
    });

    return new Map(configs.map((config) => [config.deviceId, config]));
  }

  async applyCalibration(
    deviceId: number,
    metric: string,
    offset: number,
    notes?: string,
  ) {
    this.assertMetric(metric);
    const normalizedOffset = this.assertNumber(offset, 'ajuste');
    const config = await this.ensureConfig(deviceId);

    config.calibrationOffsets = {
      ...(config.calibrationOffsets ?? {}),
      [metric]: normalizedOffset,
    };
    config.lastNotes = notes?.trim() || config.lastNotes;

    return this.sensorConfigsRepository.save(config);
  }

  async updateParameter(
    deviceId: number,
    metric: string,
    value: number,
    notes?: string,
  ) {
    this.assertMetric(metric);
    const normalizedValue = this.clampToMetric(
      metric,
      this.assertNumber(value, 'parametro'),
    );
    const config = await this.ensureConfig(deviceId);

    config.parameterOverrides = {
      ...(config.parameterOverrides ?? {}),
      [metric]: normalizedValue,
    };
    config.lastNotes = notes?.trim() || config.lastNotes;

    return this.sensorConfigsRepository.save(config);
  }

  async resetDeviceConfig(deviceId: number) {
    const config = await this.ensureConfig(deviceId);
    config.calibrationOffsets = {};
    config.parameterOverrides = {};
    config.lastNotes = 'Configuracion reiniciada desde control de sensores';

    return this.sensorConfigsRepository.save(config);
  }

  private async ensureConfig(deviceId: number) {
    const existingConfig = await this.findByDevice(deviceId);

    if (existingConfig) {
      return existingConfig;
    }

    return this.sensorConfigsRepository.save(
      this.sensorConfigsRepository.create({
        deviceId,
        calibrationOffsets: {},
        parameterOverrides: {},
        lastNotes: null,
      }),
    );
  }

  private assertMetric(metric: string) {
    if (!this.metricLimits[metric]) {
      throw new BadRequestException('Variable de sensor no soportada');
    }
  }

  private assertNumber(value: number, fieldName: string) {
    const normalizedValue = Number(value);

    if (!Number.isFinite(normalizedValue)) {
      throw new BadRequestException(`El ${fieldName} debe ser numerico`);
    }

    return normalizedValue;
  }

  private clampToMetric(metric: string, value: number) {
    const limits = this.metricLimits[metric];

    return Math.max(limits.min, Math.min(value, limits.max));
  }
}
