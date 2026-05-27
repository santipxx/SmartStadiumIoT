import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import {
  ApexAxisChartSeries,
  ApexChart,
  ApexDataLabels,
  ApexGrid,
  ApexLegend,
  ApexMarkers,
  ApexNoData,
  ApexStroke,
  ApexTooltip,
  ApexXAxis,
  ApexYAxis,
  NgApexchartsModule,
} from 'ng-apexcharts';
import { forkJoin } from 'rxjs';

import { Device, DevicesService } from '../../services/devices';
import { TelemetryReading, TelemetryService } from '../../services/telemetry';

type AssistantStep =
  | 'intent'
  | 'scope'
  | 'device'
  | 'zone'
  | 'range'
  | 'metric'
  | 'result';

type Scope = 'device' | 'zone' | 'all';
type Sender = 'assistant' | 'user';

interface ChatMessage {
  sender: Sender;
  text: string;
}

interface OptionButton {
  label: string;
  value: string;
}

interface MetricDefinition {
  key: MetricKey;
  label: string;
  unit: string;
}

interface TimeRangeOption {
  label: string;
  value: string;
  minutes: number | null;
}

type MetricKey =
  | 'temperature'
  | 'humidity'
  | 'noise'
  | 'occupancy'
  | 'co2'
  | 'lightLevel'
  | 'peopleFlow'
  | 'energyConsumption'
  | 'voltage';

type ChartOptions = {
  series: ApexAxisChartSeries;
  chart: ApexChart;
  colors: string[];
  dataLabels: ApexDataLabels;
  grid: ApexGrid;
  legend: ApexLegend;
  markers: ApexMarkers;
  noData: ApexNoData;
  stroke: ApexStroke;
  tooltip: ApexTooltip;
  xaxis: ApexXAxis;
  yaxis: ApexYAxis;
};

@Component({
  selector: 'app-ai-assistant',
  imports: [CommonModule, NgApexchartsModule],
  templateUrl: './ai-assistant.html',
  styleUrl: './ai-assistant.css',
})
export class AiAssistant implements OnInit {
  readonly metrics: MetricDefinition[] = [
    { key: 'temperature', label: 'Temperatura', unit: 'C' },
    { key: 'humidity', label: 'Humedad', unit: '%' },
    { key: 'noise', label: 'Ruido', unit: 'dB' },
    { key: 'occupancy', label: 'Ocupacion', unit: '%' },
    { key: 'co2', label: 'CO2', unit: 'ppm' },
    { key: 'lightLevel', label: 'Iluminacion', unit: 'lux' },
    { key: 'peopleFlow', label: 'Flujo de personas', unit: 'pers/min' },
    { key: 'energyConsumption', label: 'Consumo energetico', unit: 'kWh' },
    { key: 'voltage', label: 'Voltaje', unit: 'V' },
  ];

  readonly timeRanges: TimeRangeOption[] = [
    { label: 'Ultimos 15 minutos', value: '15m', minutes: 15 },
    { label: 'Ultima hora', value: '1h', minutes: 60 },
    { label: 'Ultimas 6 horas', value: '6h', minutes: 360 },
    { label: 'Ultimas 24 horas', value: '24h', minutes: 1440 },
    { label: 'Todo lo disponible', value: 'all', minutes: null },
  ];

  devices: Device[] = [];
  telemetry: TelemetryReading[] = [];
  messages: ChatMessage[] = [];
  options: OptionButton[] = [];
  step: AssistantStep = 'intent';
  loading = true;
  error = '';
  resultReady = false;
  chartOptions: ChartOptions = this.createChartOptions();
  selectedScope: Scope = 'all';
  selectedDeviceId: number | null = null;
  selectedZone = '';
  selectedRange = 'all';
  selectedMetric: MetricKey = 'temperature';
  filteredReadings: TelemetryReading[] = [];

  constructor(
    private readonly devicesService: DevicesService,
    private readonly telemetryService: TelemetryService,
  ) { }

  ngOnInit(): void {
    this.loadAssistantData();
  }

  get zones(): string[] {
    return Array.from(
      new Set(this.devices.map((device) => device.zone).filter(Boolean)),
    ).sort();
  }

  get selectedMetricDefinition(): MetricDefinition {
    return (
      this.metrics.find((metric) => metric.key === this.selectedMetric) ??
      this.metrics[0]
    );
  }

  get selectedRangeLabel(): string {
    return (
      this.timeRanges.find((range) => range.value === this.selectedRange)
        ?.label ?? 'Todo lo disponible'
    );
  }

  get scopeLabel(): string {
    if (this.selectedScope === 'device') {
      return this.deviceName(this.selectedDeviceId);
    }

    if (this.selectedScope === 'zone') {
      return this.selectedZone;
    }

    return 'Todo el estadio';
  }

  get averageValue(): number | null {
    const values = this.filteredReadings
      .map((reading) => this.valueFor(reading))
      .filter((value): value is number => value !== null);

    if (!values.length) {
      return null;
    }

    return values.reduce((total, value) => total + value, 0) / values.length;
  }

  get peakValue(): number | null {
    const values = this.filteredReadings
      .map((reading) => this.valueFor(reading))
      .filter((value): value is number => value !== null);

    return values.length ? Math.max(...values) : null;
  }

  selectOption(option: OptionButton): void {
    this.addMessage('user', option.label);

    if (this.step === 'intent') {
      this.handleIntent(option.value);
      return;
    }

    if (this.step === 'scope') {
      this.handleScope(option.value as Scope);
      return;
    }

    if (this.step === 'device') {
      this.selectedDeviceId = Number(option.value);
      this.askTimeRange();
      return;
    }

    if (this.step === 'zone') {
      this.selectedZone = option.value;
      this.askTimeRange();
      return;
    }

    if (this.step === 'range') {
      this.selectedRange = option.value;
      this.askMetric();
      return;
    }

    if (this.step === 'metric') {
      this.selectedMetric = option.value as MetricKey;
      this.generateChart();
    }
  }

  restart(): void {
    this.messages = [];
    this.resultReady = false;
    this.filteredReadings = [];
    this.chartOptions = this.createChartOptions();
    this.selectedScope = 'all';
    this.selectedDeviceId = null;
    this.selectedZone = '';
    this.selectedRange = 'all';
    this.selectedMetric = 'temperature';
    this.startConversation();
  }

  refreshData(): void {
    this.loadAssistantData(true);
  }

  formatValue(value: number | null): string {
    if (value === null) {
      return 'Sin datos';
    }

    return `${value.toFixed(1)} ${this.selectedMetricDefinition.unit}`;
  }

  trackMessage(index: number): number {
    return index;
  }

  trackOption(_: number, option: OptionButton): string {
    return option.value;
  }

  private loadAssistantData(keepConversation = false): void {
    this.loading = true;
    this.error = '';

    forkJoin({
      devices: this.devicesService.getDevices(),
      telemetry: this.telemetryService.getTelemetry(),
    }).subscribe({
      next: ({ devices, telemetry }) => {
        this.devices = devices;
        this.telemetry = telemetry;
        this.loading = false;

        if (!keepConversation) {
          this.startConversation();
        } else if (this.resultReady) {
          this.generateChart(false);
        }
      },
      error: () => {
        this.loading = false;
        this.error =
          'No pude conectarme con la central IoT. Revisa que el backend este activo.';
        this.startConversation();
      },
    });
  }

  private startConversation(): void {
    this.step = 'intent';
    this.addMessage(
      'assistant',
      'Hola, soy el asistente guiado del estadio. Puedo ayudarte a armar una consulta sin que tengas que buscar los filtros manualmente.',
    );
    this.addMessage('assistant', 'Que quieres revisar?');
    this.options = [
      { label: 'Crear grafica de telemetria', value: 'chart' },
      { label: 'Ver estado general', value: 'status' },
      { label: 'Consultar alertas recientes', value: 'alerts' },
    ];
  }

  private handleIntent(intent: string): void {
    if (intent === 'chart') {
      this.askScope();
      return;
    }

    if (intent === 'status') {
      this.addMessage(
        'assistant',
        `Tengo ${this.devices.length} dispositivos registrados y ${this.telemetry.length} lecturas recientes cargadas.`,
      );
      this.options = [{ label: 'Crear grafica ahora', value: 'chart' }];
      this.step = 'intent';
      return;
    }

    this.addMessage(
      'assistant',
      'Para alertas, entra a la pantalla Alertas. Alli puedes crear reglas por sensor, dato y umbral.',
    );
    this.options = [{ label: 'Crear grafica ahora', value: 'chart' }];
    this.step = 'intent';
  }

  private askScope(): void {
    this.step = 'scope';
    this.addMessage(
      'assistant',
      'Listo. Primero dime si quieres analizar un sensor puntual, una localidad o todo el estadio.',
    );
    this.options = [
      { label: 'Un dispositivo', value: 'device' },
      { label: 'Una localidad', value: 'zone' },
      { label: 'Todo el estadio', value: 'all' },
    ];
  }

  private handleScope(scope: Scope): void {
    this.selectedScope = scope;

    if (scope === 'device') {
      this.step = 'device';
      this.addMessage('assistant', 'Escoge el dispositivo que quieres analizar.');
      this.options = this.devices.map((device) => ({
        label: device.name,
        value: String(device.id),
      }));
      return;
    }

    if (scope === 'zone') {
      this.step = 'zone';
      this.addMessage('assistant', 'Escoge la localidad o zona del estadio.');
      this.options = this.zones.map((zone) => ({
        label: zone,
        value: zone,
      }));
      return;
    }

    this.askTimeRange();
  }

  private askTimeRange(): void {
    this.step = 'range';
    this.addMessage('assistant', 'Ahora elige el rango de tiempo para la grafica.');
    this.options = this.timeRanges.map((range) => ({
      label: range.label,
      value: range.value,
    }));
  }

  private askMetric(): void {
    this.step = 'metric';
    this.addMessage('assistant', 'Que dato quieres graficar?');
    this.options = this.metrics.map((metric) => ({
      label: `${metric.label} (${metric.unit})`,
      value: metric.key,
    }));
  }

  private generateChart(addResultMessage = true): void {
    this.step = 'result';
    this.options = [];
    this.filteredReadings = this.filterReadings();

    if (addResultMessage) {
      this.addMessage(
        'assistant',
        `Perfecto. Te prepare una grafica de ${this.selectedMetricDefinition.label} para ${this.scopeLabel}, en el rango ${this.selectedRangeLabel.toLowerCase()}.`,
      );
    }

    this.updateChart();
    this.resultReady = true;
  }

  private filterReadings(): TelemetryReading[] {
    const selectedRange = this.timeRanges.find(
      (range) => range.value === this.selectedRange,
    );
    const cutoff =
      selectedRange?.minutes === null || selectedRange?.minutes === undefined
        ? null
        : Date.now() - selectedRange.minutes * 60 * 1000;

    return this.telemetry
      .filter((reading) => {
        if (this.selectedScope === 'device') {
          return reading.deviceId === this.selectedDeviceId;
        }

        if (this.selectedScope === 'zone') {
          return this.deviceZone(reading.deviceId) === this.selectedZone;
        }

        return true;
      })
      .filter((reading) => {
        if (cutoff === null) {
          return true;
        }

        return new Date(reading.createdAt).getTime() >= cutoff;
      })
      .filter((reading) => this.valueFor(reading) !== null)
      .sort(
        (first, second) =>
          new Date(first.createdAt).getTime() -
          new Date(second.createdAt).getTime(),
      );
  }

  private updateChart(): void {
    const groupedReadings = new Map<string, { x: number; y: number }[]>();

    for (const reading of this.filteredReadings) {
      const value = this.valueFor(reading);

      if (value === null) {
        continue;
      }

      const deviceName = this.deviceName(reading.deviceId);
      const points = groupedReadings.get(deviceName) ?? [];
      points.push({
        x: new Date(reading.createdAt).getTime(),
        y: value,
      });
      groupedReadings.set(deviceName, points);
    }

    const metric = this.selectedMetricDefinition;

    this.chartOptions = {
      ...this.chartOptions,
      series: Array.from(groupedReadings.entries()).map(([name, data]) => ({
        name,
        data,
      })),
      noData: {
        text: 'Sin datos para esta consulta',
        align: 'center',
        verticalAlign: 'middle',
        style: {
          color: '#64748b',
          fontSize: '14px',
        },
      },
      tooltip: {
        x: { format: 'HH:mm:ss' },
        y: {
          formatter: (value: number) => `${value.toFixed(2)} ${metric.unit}`,
        },
      },
      yaxis: {
        labels: {
          formatter: (value: number) => value.toFixed(0),
        },
        title: {
          text: `${metric.label} (${metric.unit})`,
        },
      },
    };
  }

  private valueFor(reading: TelemetryReading): number | null {
    const rawValue = reading[this.selectedMetric];

    if (rawValue === null || rawValue === undefined || rawValue === '') {
      return null;
    }

    const value = Number(rawValue);

    return Number.isFinite(value) ? value : null;
  }

  private deviceName(deviceId: number | null): string {
    if (deviceId === null) {
      return 'Todo el estadio';
    }

    return (
      this.devices.find((device) => device.id === deviceId)?.name ??
      `Dispositivo ${deviceId}`
    );
  }

  private deviceZone(deviceId: number): string {
    return this.devices.find((device) => device.id === deviceId)?.zone ?? '';
  }

  private addMessage(sender: Sender, text: string): void {
    this.messages = [...this.messages, { sender, text }];
  }

  private createChartOptions(): ChartOptions {
    return {
      series: [],
      chart: {
        type: 'line',
        height: 340,
        animations: { enabled: true },
        toolbar: { show: false },
        zoom: { enabled: false },
      },
      colors: ['#198754', '#0d6efd', '#fd7e14', '#dc3545', '#6f42c1', '#20c997'],
      dataLabels: { enabled: false },
      grid: {
        borderColor: '#e9ecef',
        strokeDashArray: 4,
      },
      legend: {
        position: 'bottom',
        horizontalAlign: 'left',
      },
      markers: {
        size: 3,
        strokeWidth: 0,
      },
      noData: {
        text: 'Sin datos',
      },
      stroke: {
        curve: 'smooth',
        width: 3,
      },
      tooltip: {
        theme: 'light',
      },
      xaxis: {
        type: 'datetime',
        labels: {
          datetimeUTC: false,
        },
      },
      yaxis: {
        labels: {
          formatter: (value: number) => value.toFixed(0),
        },
      },
    };
  }
}
