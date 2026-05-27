import { Column, Entity, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity('devices')
export class Device {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ name: 'device_code', unique: true })
    deviceCode: string;

    @Column()
    name: string;

    @Column()
    zone: string;

    @Column({ name: 'device_type' })
    deviceType: string;

    @Column({ default: 'active' })
    status: string;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;
}