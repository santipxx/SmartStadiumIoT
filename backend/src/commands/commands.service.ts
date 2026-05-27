import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Command } from './command.entity';
import { Device } from '../devices/device.entity';
import { SensorConfigsService } from '../sensor-configs/sensor-configs.service';

@Injectable()
export class CommandsService {
    constructor(
        @InjectRepository(Command)
        private readonly commandsRepository: Repository<Command>,

        @InjectRepository(Device)
        private readonly devicesRepository: Repository<Device>,

        private readonly sensorConfigsService: SensorConfigsService,
    ) { }

    async create(data: any) {
        const device = await this.devicesRepository.findOne({
            where: { id: Number(data.deviceId) },
        });

        if (!device) {
            throw new NotFoundException('Dispositivo no encontrado');
        }

        const commandValue = this.normalizePayload(data.value);
        const command = this.commandsRepository.create({
            deviceId: Number(data.deviceId),
            command: data.command,
            value: this.serializeValue(commandValue ?? data.value),
            status: data.status ?? 'pending',
        });

        command.status = await this.applyDeviceEffect(
            device,
            command.command,
            command.status,
            commandValue,
        );

        return this.commandsRepository.save(command);
    }

    findAll() {
        return this.commandsRepository.find({
            relations: ['device'],
            order: {
                createdAt: 'DESC',
            },
            take: 100,
        });
    }

    findByDevice(deviceId: number) {
        return this.commandsRepository.find({
            where: { deviceId },
            relations: ['device'],
            order: {
                createdAt: 'DESC',
            },
            take: 50,
        });
    }

    async updateStatus(id: number, status: string) {
        const command = await this.commandsRepository.findOne({
            where: { id },
        });

        if (!command) {
            throw new NotFoundException('Comando no encontrado');
        }

        command.status = status;

        return this.commandsRepository.save(command);
    }

    private async applyDeviceEffect(
        device: Device,
        commandName: string,
        fallbackStatus: string,
        value: Record<string, unknown> | null,
    ) {
        switch (commandName) {
            case 'pause_telemetry':
                device.status = 'inactive';
                await this.devicesRepository.save(device);
                return 'executed';
            case 'resume_telemetry':
                device.status = 'active';
                await this.devicesRepository.save(device);
                return 'executed';
            case 'maintenance_mode':
                device.status = 'maintenance';
                await this.devicesRepository.save(device);
                return 'executed';
            case 'calibrate_sensor':
                await this.sensorConfigsService.applyCalibration(
                    device.id,
                    String(value?.metric ?? ''),
                    Number(value?.offset),
                    String(value?.notes ?? ''),
                );
                return 'executed';
            case 'update_parameter':
                await this.sensorConfigsService.updateParameter(
                    device.id,
                    String(value?.metric ?? ''),
                    Number(value?.value),
                    String(value?.notes ?? ''),
                );
                return 'executed';
            case 'reset_sensor_config':
                await this.sensorConfigsService.resetDeviceConfig(device.id);
                return 'executed';
            default:
                return fallbackStatus;
        }
    }

    private normalizePayload(value: unknown): Record<string, unknown> | null {
        if (!value) {
            return null;
        }

        if (typeof value === 'object' && !Array.isArray(value)) {
            return value as Record<string, unknown>;
        }

        if (typeof value === 'string') {
            try {
                const parsed = JSON.parse(value);

                if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
                    return parsed as Record<string, unknown>;
                }
            } catch {
                return null;
            }
        }

        return null;
    }

    private serializeValue(value: unknown): string | null {
        if (value === undefined || value === null || value === '') {
            return null;
        }

        if (typeof value === 'string') {
            return value;
        }

        return JSON.stringify(value);
    }
}
