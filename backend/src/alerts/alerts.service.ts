import {
    BadRequestException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';

import { Alert } from './alert.entity';
import { AlertRule } from './alert-rule.entity';
import { Device } from '../devices/device.entity';

type TelemetrySnapshot = {
    deviceId: number;
    temperature?: unknown;
    humidity?: unknown;
    noise?: unknown;
    occupancy?: unknown;
    co2?: unknown;
    lightLevel?: unknown;
    peopleFlow?: unknown;
    energyConsumption?: unknown;
    voltage?: unknown;
};

@Injectable()
export class AlertsService {
    private readonly metricLabels: Record<string, string> = {
        temperature: 'Temperatura',
        humidity: 'Humedad',
        noise: 'Ruido',
        occupancy: 'Ocupacion',
        co2: 'CO2',
        lightLevel: 'Iluminacion',
        peopleFlow: 'Flujo de personas',
        energyConsumption: 'Consumo energetico',
        voltage: 'Voltaje',
    };

    private readonly metricUnits: Record<string, string> = {
        temperature: 'C',
        humidity: '%',
        noise: 'dB',
        occupancy: '%',
        co2: 'ppm',
        lightLevel: 'lux',
        peopleFlow: 'personas/min',
        energyConsumption: 'kWh',
        voltage: 'V',
    };

    private readonly operatorLabels: Record<string, string> = {
        gt: 'mayor que',
        gte: 'mayor o igual que',
        lt: 'menor que',
        lte: 'menor o igual que',
    };

    constructor(
        @InjectRepository(Alert)
        private readonly alertsRepository: Repository<Alert>,

        @InjectRepository(AlertRule)
        private readonly alertRulesRepository: Repository<AlertRule>,

        @InjectRepository(Device)
        private readonly devicesRepository: Repository<Device>,
    ) { }

    create(deviceId: number, alertType: string, message: string, severity: string) {
        const alert = this.alertsRepository.create({
            deviceId,
            alertType,
            message,
            severity,
        });

        return this.alertsRepository.save(alert);
    }

    findAll() {
        return this.alertsRepository.find({
            relations: ['device'],
            order: {
                createdAt: 'DESC',
            },
            take: 100,
        });
    }

    findByDevice(deviceId: number) {
        return this.alertsRepository.find({
            where: { deviceId },
            relations: ['device'],
            order: {
                createdAt: 'DESC',
            },
            take: 50,
        });
    }

    async findRules() {
        return this.alertRulesRepository.find({
            relations: ['device'],
            order: {
                createdAt: 'DESC',
            },
        });
    }

    async createRule(data: any) {
        const ruleData = await this.normalizeRuleData(data);
        const rule = this.alertRulesRepository.create(ruleData);

        return this.alertRulesRepository.save(rule);
    }

    async updateRule(id: number, data: any) {
        const rule = await this.alertRulesRepository.findOne({
            where: { id },
        });

        if (!rule) {
            throw new NotFoundException('Regla de alerta no encontrada');
        }

        const ruleData = await this.normalizeRuleData(data, true);

        Object.assign(rule, ruleData);

        return this.alertRulesRepository.save(rule);
    }

    async deleteRule(id: number) {
        const rule = await this.alertRulesRepository.findOne({
            where: { id },
        });

        if (!rule) {
            throw new NotFoundException('Regla de alerta no encontrada');
        }

        await this.alertRulesRepository.remove(rule);

        return {
            deleted: true,
            id,
        };
    }

    async evaluateRules(telemetry: TelemetrySnapshot) {
        const rules = await this.alertRulesRepository.find({
            where: [
                { enabled: true, deviceId: telemetry.deviceId },
                { enabled: true, deviceId: IsNull() },
            ],
        });

        for (const rule of rules) {
            const value = this.getTelemetryValue(telemetry, rule.metric);

            if (value === null || !this.matchesRule(value, rule)) {
                continue;
            }

            const unit = this.metricUnits[rule.metric] ?? '';
            const metricLabel = this.metricLabels[rule.metric] ?? rule.metric;
            const threshold = Number(rule.threshold);

            await this.create(
                telemetry.deviceId,
                rule.name,
                `Regla "${rule.name}": ${metricLabel} reporto ${value} ${unit}; umbral ${this.operatorLabels[rule.operator]} ${threshold} ${unit}.`,
                rule.severity,
            );
        }
    }

    private async normalizeRuleData(data: any, partial = false) {
        const normalized: Partial<AlertRule> = {};

        if (!partial || data.deviceId !== undefined) {
            const deviceId = data.deviceId === null || data.deviceId === 'all'
                ? null
                : Number(data.deviceId);

            if (deviceId !== null) {
                const device = await this.devicesRepository.findOne({
                    where: { id: deviceId },
                });

                if (!device) {
                    throw new NotFoundException('Dispositivo no encontrado');
                }
            }

            normalized.deviceId = deviceId;
        }

        if (!partial || data.metric !== undefined) {
            if (!this.metricLabels[data.metric]) {
                throw new BadRequestException('Metrica no soportada para alertas');
            }

            normalized.metric = data.metric;
        }

        if (!partial || data.operator !== undefined) {
            if (!this.operatorLabels[data.operator]) {
                throw new BadRequestException('Operador no soportado');
            }

            normalized.operator = data.operator;
        }

        if (!partial || data.threshold !== undefined) {
            const threshold = Number(data.threshold);

            if (!Number.isFinite(threshold)) {
                throw new BadRequestException('El umbral debe ser numerico');
            }

            normalized.threshold = threshold;
        }

        if (!partial || data.severity !== undefined) {
            const severity = data.severity ?? 'medium';

            if (!['low', 'medium', 'high', 'critical'].includes(severity)) {
                throw new BadRequestException('Severidad no soportada');
            }

            normalized.severity = severity;
        }

        if (!partial || data.enabled !== undefined) {
            normalized.enabled = data.enabled ?? true;
        }

        if (!partial || data.name !== undefined) {
            const name = String(data.name ?? '').trim();
            const metric = normalized.metric ?? data.metric;
            const operator = normalized.operator ?? data.operator;
            const threshold = normalized.threshold ?? data.threshold;
            const metricLabel = this.metricLabels[metric] ?? metric;

            normalized.name =
                name || `${metricLabel} ${this.operatorLabels[operator]} ${threshold}`;
        }

        return normalized;
    }

    private getTelemetryValue(telemetry: TelemetrySnapshot, metric: string): number | null {
        const value = (telemetry as Record<string, unknown>)[metric];

        if (value === null || value === undefined || value === '') {
            return null;
        }

        const parsedValue = Number(value);

        return Number.isFinite(parsedValue) ? parsedValue : null;
    }

    private matchesRule(value: number, rule: AlertRule): boolean {
        const threshold = Number(rule.threshold);

        if (rule.operator === 'gt') {
            return value > threshold;
        }

        if (rule.operator === 'gte') {
            return value >= threshold;
        }

        if (rule.operator === 'lt') {
            return value < threshold;
        }

        if (rule.operator === 'lte') {
            return value <= threshold;
        }

        return false;
    }
}
