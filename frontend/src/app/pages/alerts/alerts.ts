import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { finalize } from 'rxjs/operators';

import {
  AlertEvent,
  AlertRule,
  AlertsService,
  CreateAlertRulePayload,
} from '../../services/alerts';
import { Device, DevicesService } from '../../services/devices';

interface MetricDefinition {
  key: string;
  label: string;
  unit: string;
  defaultThreshold: number;
}

@Component({
  selector: 'app-alerts',
  imports: [CommonModule, FormsModule],
  templateUrl: './alerts.html',
  styleUrl: './alerts.css',
})
export class Alerts implements OnInit {
  readonly metrics: MetricDefinition[] = [
    { key: 'temperature', label: 'Temperatura', unit: 'C', defaultThreshold: 35 },
    { key: 'humidity', label: 'Humedad', unit: '%', defaultThreshold: 85 },
    { key: 'noise', label: 'Ruido', unit: 'dB', defaultThreshold: 110 },
    { key: 'occupancy', label: 'Ocupacion', unit: '%', defaultThreshold: 90 },
    { key: 'co2', label: 'CO2', unit: 'ppm', defaultThreshold: 1200 },
    { key: 'lightLevel', label: 'Iluminacion', unit: 'lux', defaultThreshold: 250 },
    { key: 'peopleFlow', label: 'Flujo de personas', unit: 'pers/min', defaultThreshold: 600 },
    { key: 'energyConsumption', label: 'Consumo energetico', unit: 'kWh', defaultThreshold: 550 },
    { key: 'voltage', label: 'Voltaje', unit: 'V', defaultThreshold: 130 },
  ];

  readonly operators = [
    { value: 'gt', label: 'Mayor que' },
    { value: 'gte', label: 'Mayor o igual que' },
    { value: 'lt', label: 'Menor que' },
    { value: 'lte', label: 'Menor o igual que' },
  ];

  readonly severities = [
    { value: 'low', label: 'Baja' },
    { value: 'medium', label: 'Media' },
    { value: 'high', label: 'Alta' },
    { value: 'critical', label: 'Critica' },
  ];

  devices: Device[] = [];
  rules: AlertRule[] = [];
  alerts: AlertEvent[] = [];
  loading = true;
  saving = false;
  error = '';
  success = '';
  form = this.defaultForm();

  constructor(
    private readonly alertsService: AlertsService,
    private readonly devicesService: DevicesService,
  ) { }

  ngOnInit(): void {
    this.loadAlerts();
  }

  get activeRulesCount(): number {
    return this.rules.filter((rule) => rule.enabled).length;
  }

  get criticalAlertsCount(): number {
    return this.alerts.filter((alert) => alert.severity === 'critical').length;
  }

  get recentAlerts(): AlertEvent[] {
    return this.alerts.slice(0, 10);
  }

  get selectedMetric(): MetricDefinition {
    return (
      this.metrics.find((metric) => metric.key === this.form.metric) ??
      this.metrics[0]
    );
  }

  loadAlerts(): void {
    this.loading = true;
    this.error = '';

    forkJoin({
      devices: this.devicesService.getDevices(),
      rules: this.alertsService.getRules(),
      alerts: this.alertsService.getAlerts(),
    })
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: ({ devices, rules, alerts }) => {
          this.devices = devices;
          this.rules = rules;
          this.alerts = alerts;
        },
        error: () => {
          this.error =
            'No se pudieron cargar las alertas. Revisa que el backend este activo.';
        },
      });
  }

  createRule(): void {
    const threshold = Number(this.form.threshold);

    if (!Number.isFinite(threshold)) {
      this.error = 'El umbral debe ser un numero valido.';
      return;
    }

    this.saving = true;
    this.error = '';
    this.success = '';

    const payload: CreateAlertRulePayload = {
      deviceId:
        this.form.deviceId === 'all' ? null : Number(this.form.deviceId),
      name: this.form.name.trim(),
      metric: this.form.metric,
      operator: this.form.operator,
      threshold,
      severity: this.form.severity,
      enabled: this.form.enabled,
    };

    this.alertsService
      .createRule(payload)
      .pipe(finalize(() => (this.saving = false)))
      .subscribe({
        next: () => {
          this.success = 'Regla de alerta creada.';
          this.form = this.defaultForm();
          this.loadAlerts();
        },
        error: () => {
          this.error = 'No se pudo crear la regla de alerta.';
        },
      });
  }

  toggleRule(rule: AlertRule): void {
    this.alertsService.updateRule(rule.id, { enabled: !rule.enabled }).subscribe({
      next: (updatedRule) => {
        this.rules = this.rules.map((item) =>
          item.id === updatedRule.id ? updatedRule : item,
        );
      },
      error: () => {
        this.error = 'No se pudo actualizar la regla.';
      },
    });
  }

  deleteRule(rule: AlertRule): void {
    this.alertsService.deleteRule(rule.id).subscribe({
      next: () => {
        this.rules = this.rules.filter((item) => item.id !== rule.id);
      },
      error: () => {
        this.error = 'No se pudo eliminar la regla.';
      },
    });
  }

  onMetricChange(): void {
    this.form.threshold = this.selectedMetric.defaultThreshold;
  }

  metricLabel(metricKey: string): string {
    return (
      this.metrics.find((metric) => metric.key === metricKey)?.label ??
      metricKey
    );
  }

  metricUnit(metricKey: string): string {
    return this.metrics.find((metric) => metric.key === metricKey)?.unit ?? '';
  }

  operatorLabel(operator: string): string {
    return (
      this.operators.find((item) => item.value === operator)?.label ??
      operator
    );
  }

  severityLabel(severity: string): string {
    return (
      this.severities.find((item) => item.value === severity)?.label ??
      severity
    );
  }

  severityClass(severity: string): string {
    const classes: Record<string, string> = {
      low: 'text-bg-info',
      medium: 'text-bg-warning',
      high: 'text-bg-danger',
      critical: 'text-bg-dark',
    };

    return classes[severity] ?? 'text-bg-secondary';
  }

  deviceName(deviceId: number | null, device?: Device | null): string {
    if (device) {
      return device.name;
    }

    if (deviceId === null) {
      return 'Todos los sensores';
    }

    return (
      this.devices.find((item) => item.id === deviceId)?.name ??
      `Dispositivo ${deviceId}`
    );
  }

  trackRule(_: number, rule: AlertRule): number {
    return rule.id;
  }

  trackAlert(_: number, alert: AlertEvent): number {
    return alert.id;
  }

  trackDevice(_: number, device: Device): number {
    return device.id;
  }

  private defaultForm() {
    return {
      deviceId: 'all',
      name: '',
      metric: 'temperature',
      operator: 'gt',
      threshold: 35,
      severity: 'high',
      enabled: true,
    };
  }
}
