import {
    Column,
    CreateDateColumn,
    Entity,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
} from 'typeorm';

import { Device } from '../devices/device.entity';

@Entity('telemetry')
export class Telemetry {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ name: 'device_id' })
    deviceId: number;

    @ManyToOne(() => Device)
    @JoinColumn({ name: 'device_id' })
    device: Device;

    @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
    temperature: number;

    @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
    humidity: number;

    @Column({ type: 'decimal', precision: 6, scale: 2, nullable: true })
    noise: number;

    @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
    occupancy: number;

    @Column({ type: 'decimal', precision: 8, scale: 2, nullable: true })
    co2: number;

    @Column({ name: 'light_level', type: 'decimal', precision: 8, scale: 2, nullable: true })
    lightLevel: number;

    @Column({ name: 'people_flow', nullable: true })
    peopleFlow: number;

    @Column({ name: 'energy_consumption', type: 'decimal', precision: 8, scale: 2, nullable: true })
    energyConsumption: number;

    @Column({ type: 'decimal', precision: 6, scale: 2, nullable: true })
    voltage: number;

    @Column({ name: 'door_status', nullable: true })
    doorStatus: string;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;
}