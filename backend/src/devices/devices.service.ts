import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Device } from './device.entity';

@Injectable()
export class DevicesService {
    private readonly allowedStatuses = ['active', 'inactive', 'maintenance'];

    constructor(
        @InjectRepository(Device)
        private readonly devicesRepository: Repository<Device>,
    ) { }

    findAll() {
        return this.devicesRepository.find({
            order: {
                id: 'ASC',
            },
        });
    }

    findOne(id: number) {
        return this.devicesRepository.findOne({
            where: { id },
        });
    }

    async updateStatus(id: number, status: string) {
        const normalizedStatus = String(status ?? '').trim().toLowerCase();

        if (!this.allowedStatuses.includes(normalizedStatus)) {
            throw new BadRequestException('Estado de dispositivo no valido');
        }

        const device = await this.findOne(id);

        if (!device) {
            throw new NotFoundException('Dispositivo no encontrado');
        }

        device.status = normalizedStatus;

        return this.devicesRepository.save(device);
    }
}
