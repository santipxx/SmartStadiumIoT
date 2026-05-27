import {
    Column,
    CreateDateColumn,
    Entity,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
} from 'typeorm';

import { Device } from '../devices/device.entity';

@Entity('alerts')
export class Alert {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ name: 'device_id' })
    deviceId: number;

    @ManyToOne(() => Device)
    @JoinColumn({ name: 'device_id' })
    device: Device;

    @Column({ name: 'alert_type' })
    alertType: string;

    @Column({ type: 'text' })
    message: string;

    @Column()
    severity: string;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;
}