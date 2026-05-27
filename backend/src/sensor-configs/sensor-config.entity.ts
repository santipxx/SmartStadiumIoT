import {
  Column,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { Device } from '../devices/device.entity';

export type MetricConfig = Record<string, number>;

@Entity('sensor_configs')
export class SensorConfig {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'device_id', unique: true })
  deviceId: number;

  @OneToOne(() => Device)
  @JoinColumn({ name: 'device_id' })
  device: Device;

  @Column({
    name: 'calibration_offsets',
    type: 'jsonb',
    default: () => "'{}'::jsonb",
  })
  calibrationOffsets: MetricConfig;

  @Column({
    name: 'parameter_overrides',
    type: 'jsonb',
    default: () => "'{}'::jsonb",
  })
  parameterOverrides: MetricConfig;

  @Column({ name: 'last_notes', type: 'text', nullable: true })
  lastNotes: string | null;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
