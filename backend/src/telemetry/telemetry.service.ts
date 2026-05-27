import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Telemetry } from './telemetry.entity';
import { Device } from '../devices/device.entity';
import { AlertsService } from '../alerts/alerts.service';

@Injectable()
export class TelemetryService {
    constructor(
        @InjectRepository(Telemetry)
        private readonly telemetryRepository: Repository<Telemetry>,

        @InjectRepository(Device)
        private readonly devicesRepository: Repository<Device>,

        private readonly alertsService: AlertsService,
    ) { }

    async create(data: any) {
        const device = await this.devicesRepository.findOne({
            where: { id: Number(data.deviceId) },
        });

        if (!device) {
            throw new NotFoundException('Dispositivo no encontrado');
        }

        const telemetry = this.telemetryRepository.create({
            deviceId: Number(data.deviceId),
            temperature: data.temperature,
            humidity: data.humidity,
            noise: data.noise,
            occupancy: data.occupancy,
            co2: data.co2,
            lightLevel: data.lightLevel,
            peopleFlow: data.peopleFlow,
            energyConsumption: data.energyConsumption,
            voltage: data.voltage,
            doorStatus: data.doorStatus,
        });

        const savedTelemetry = await this.telemetryRepository.save(telemetry);

        await this.evaluateAlerts(savedTelemetry);
        await this.alertsService.evaluateRules(savedTelemetry);

        return savedTelemetry;
    }

    findAll() {
        return this.telemetryRepository.find({
            relations: ['device'],
            order: {
                createdAt: 'DESC',
            },
            take: 100,
        });
    }

    findByDevice(deviceId: number) {
        return this.telemetryRepository.find({
            where: { deviceId },
            order: {
                createdAt: 'ASC',
            },
            take: 100,
        });
    }
    private async evaluateAlerts(telemetry: Telemetry) {
        const deviceId = telemetry.deviceId;

        if (telemetry.temperature !== null && Number(telemetry.temperature) > 35) {
            await this.alertsService.create(
                deviceId,
                'Temperatura alta',
                `La temperatura superó el límite permitido: ${telemetry.temperature} °C`,
                'critical',
            );
        }

        if (telemetry.humidity !== null && Number(telemetry.humidity) > 85) {
            await this.alertsService.create(
                deviceId,
                'Humedad alta',
                `La humedad superó el límite permitido: ${telemetry.humidity}%`,
                'medium',
            );
        }

        if (telemetry.noise !== null && Number(telemetry.noise) > 110) {
            await this.alertsService.create(
                deviceId,
                'Ruido elevado',
                `El nivel de ruido superó el límite permitido: ${telemetry.noise} dB`,
                'high',
            );
        }

        if (telemetry.occupancy !== null && Number(telemetry.occupancy) > 90) {
            await this.alertsService.create(
                deviceId,
                'Ocupación alta',
                `La ocupación de la zona superó el 90%: ${telemetry.occupancy}%`,
                'critical',
            );
        }

        if (telemetry.co2 !== null && Number(telemetry.co2) > 1200) {
            await this.alertsService.create(
                deviceId,
                'CO2 elevado',
                `El nivel de CO2 superó el límite recomendado: ${telemetry.co2} ppm`,
                'high',
            );
        }

        if (telemetry.lightLevel !== null && Number(telemetry.lightLevel) < 250) {
            await this.alertsService.create(
                deviceId,
                'Iluminación baja',
                `El nivel de iluminación está por debajo del mínimo recomendado: ${telemetry.lightLevel} lux`,
                'medium',
            );
        }

        if (telemetry.peopleFlow !== null && Number(telemetry.peopleFlow) > 600) {
            await this.alertsService.create(
                deviceId,
                'Flujo alto de personas',
                `El flujo de personas superó el límite operativo: ${telemetry.peopleFlow} personas/min`,
                'high',
            );
        }

        if (
            telemetry.energyConsumption !== null &&
            Number(telemetry.energyConsumption) > 550
        ) {
            await this.alertsService.create(
                deviceId,
                'Consumo energético alto',
                `El consumo eléctrico superó el límite estimado: ${telemetry.energyConsumption} kWh`,
                'medium',
            );
        }

        if (
            telemetry.voltage !== null &&
            (Number(telemetry.voltage) < 105 || Number(telemetry.voltage) > 130)
        ) {
            await this.alertsService.create(
                deviceId,
                'Voltaje fuera de rango',
                `El voltaje está fuera del rango seguro: ${telemetry.voltage} V`,
                'critical',
            );
        }

        if (telemetry.doorStatus === 'open') {
            await this.alertsService.create(
                deviceId,
                'Acceso abierto',
                'Se detectó una puerta o acceso en estado abierto.',
                'low',
            );
        }
    }
}
