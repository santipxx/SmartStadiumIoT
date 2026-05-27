import {
    Column,
    CreateDateColumn,
    Entity,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
} from 'typeorm';

import { Device } from '../devices/device.entity';

@Entity('device_commands')
export class Command {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ name: 'device_id' })
    deviceId: number;

    @ManyToOne(() => Device)
    @JoinColumn({ name: 'device_id' })
    device: Device;

    @Column()
    command: string;

    @Column({ type: 'text', nullable: true })
    value: string | null;

    @Column({ default: 'pending' })
    status: string;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;
}
