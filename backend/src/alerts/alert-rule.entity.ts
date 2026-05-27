import {
    Column,
    CreateDateColumn,
    Entity,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
} from 'typeorm';

import { Device } from '../devices/device.entity';

@Entity('alert_rules')
export class AlertRule {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ name: 'device_id', nullable: true })
    deviceId: number | null;

    @ManyToOne(() => Device, { nullable: true })
    @JoinColumn({ name: 'device_id' })
    device: Device | null;

    @Column()
    name: string;

    @Column()
    metric: string;

    @Column({ default: 'gt' })
    operator: string;

    @Column({ type: 'decimal', precision: 10, scale: 2 })
    threshold: number;

    @Column({ default: 'medium' })
    severity: string;

    @Column({ default: true })
    enabled: boolean;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;
}
