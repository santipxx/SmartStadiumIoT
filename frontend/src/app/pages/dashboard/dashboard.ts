import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin, interval, Observable, Subscription } from 'rxjs';
import { finalize } from 'rxjs/operators';
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

import { Device, DevicesService } from '../../services/devices';
import {
  SimulatorStatus,
  TelemetryReading,
  TelemetryService,
} from '../../services/telemetry';

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

interface MetricDefinition {
  key: MetricKey;
  label: string;
  unit: string;
}

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
  selector: 'app-dashboard',
  imports: [CommonModule, FormsModule, NgApexchartsModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard implements OnInit, OnDestroy {
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

  devices: Device[] = [];
  telemetry: TelemetryReading[] = [];
  simulatorStatus: SimulatorStatus | null = null;
  selectedDeviceId = 'all';
  selectedMetric: MetricKey = 'temperature';
  intervalMs = 10000;
  loading = true;
  simulatorBusy = false;
  error = '';
  lastUpdated: Date | null = null;
  chartOptions: ChartOptions = this.createChartOptions();

  private refreshSubscription: Subscription | null = null;

  constructor(
    private readonly devicesService: DevicesService,
    private readonly telemetryService: TelemetryService,
  ) { }

  ngOnInit(): void {
    this.loadDashboard();
    this.refreshSubscription = interval(5000).subscribe(() => {
      this.refreshTelemetry();
    });
  }

  ngOnDestroy(): void {
    this.refreshSubscription?.unsubscribe();
  }

  get selectedMetricDefinition(): MetricDefinition {
    return (
      this.metrics.find((metric) => metric.key === this.selectedMetric) ??
      this.metrics[0]
    );
  }

  get activeDevicesCount(): number {
    return this.devices.filter((device) => device.status === 'active').length;
  }

  get latestTableReadings(): TelemetryReading[] {
    return [...this.telemetry]
      .sort(
        (first, second) =>
          new Date(second.createdAt).getTime() -
          new Date(first.createdAt).getTime(),
      )
      .slice(0, 8);
  }

  get metricAverage(): number | null {
    const values = this.metricValues();

    if (!values.length) {
      return null;
    }

    return values.reduce((total, value) => total + value, 0) / values.length;
  }

  get metricPeak(): number | null {
    const values = this.metricValues();

    return values.length ? Math.max(...values) : null;
  }

  get lastReadingAt(): Date | null {
    const latest = this.latestTableReadings[0];

    return latest ? new Date(latest.createdAt) : null;
  }

  loadDashboard(): void {
    this.loading = true;
    this.error = '';

    forkJoin({
      devices: this.devicesService.getDevices(),
      telemetry: this.fetchTelemetry(),
      status: this.telemetryService.getSimulatorStatus(),
    })
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: ({ devices, telemetry, status }) => {
          this.devices = devices;
          this.telemetry = telemetry;
          this.simulatorStatus = status;
          this.lastUpdated = new Date();
          this.updateChart();
        },
        error: () => {
          this.error =
            'No se pudo cargar el dashboard. Revisa que el backend este activo.';
          this.updateChart();
        },
      });
  }

  refreshTelemetry(showLoading = false): void {
    if (showLoading) {
      this.loading = true;
    }

    forkJoin({
      telemetry: this.fetchTelemetry(),
      status: this.telemetryService.getSimulatorStatus(),
    })
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: ({ telemetry, status }) => {
          this.telemetry = telemetry;
          this.simulatorStatus = status;
          this.lastUpdated = new Date();
          this.updateChart();
        },
        error: () => {
          this.error = 'No se pudo actualizar la telemetria.';
        },
      });
  }

  onDeviceChange(): void {
    this.refreshTelemetry(true);
  }

  onMetricChange(): void {
    this.updateChart();
  }

  startSimulator(): void {
    this.simulatorBusy = true;
    this.error = '';

    this.telemetryService
      .startSimulator(this.intervalMs)
      .pipe(finalize(() => (this.simulatorBusy = false)))
      .subscribe({
        next: (status) => {
          this.simulatorStatus = status;
          window.setTimeout(() => this.refreshTelemetry(), 800);
        },
        error: () => {
          this.error = 'No se pudo iniciar la telemetria simulada.';
        },
      });
  }

  stopSimulator(): void {
    this.simulatorBusy = true;
    this.error = '';

    this.telemetryService
      .stopSimulator()
      .pipe(finalize(() => (this.simulatorBusy = false)))
      .subscribe({
        next: (status) => {
          this.simulatorStatus = status;
        },
        error: () => {
          this.error = 'No se pudo detener la telemetria simulada.';
        },
      });
  }

  sendBatch(): void {
    this.simulatorBusy = true;
    this.error = '';

    this.telemetryService
      .sendSimulatorBatch()
      .pipe(finalize(() => (this.simulatorBusy = false)))
      .subscribe({
        next: (status) => {
          this.simulatorStatus = status;
          this.refreshTelemetry();
        },
        error: () => {
          this.error = 'No se pudo generar una muestra de telemetria.';
        },
      });
  }

  formatMetricValue(value: number | null): string {
    if (value === null) {
      return 'Sin datos';
    }

    return `${value.toFixed(1)} ${this.selectedMetricDefinition.unit}`;
  }

  getMetricValue(reading: TelemetryReading): string {
    const value = this.valueFor(reading);

    return this.formatMetricValue(value);
  }

  getDeviceName(reading: TelemetryReading): string {
    return (
      reading.device?.name ??
      this.devices.find((device) => device.id === reading.deviceId)?.name ??
      `Dispositivo ${reading.deviceId}`
    );
  }

  trackReading(_: number, reading: TelemetryReading): number {
    return reading.id;
  }

  trackDevice(_: number, device: Device): number {
    return device.id;
  }

  private fetchTelemetry(): Observable<TelemetryReading[]> {
    if (this.selectedDeviceId === 'all') {
      return this.telemetryService.getTelemetry();
    }

    return this.telemetryService.getDeviceTelemetry(Number(this.selectedDeviceId));
  }

  private metricValues(): number[] {
    return this.telemetry
      .map((reading) => this.valueFor(reading))
      .filter((value): value is number => value !== null);
  }

  private valueFor(reading: TelemetryReading): number | null {
    const rawValue = reading[this.selectedMetric];

    if (rawValue === null || rawValue === undefined || rawValue === '') {
      return null;
    }

    const value = Number(rawValue);

    return Number.isFinite(value) ? value : null;
  }

  private updateChart(): void {
    const groupedReadings = new Map<string, { x: number; y: number }[]>();
    const orderedTelemetry = [...this.telemetry].sort(
      (first, second) =>
        new Date(first.createdAt).getTime() -
        new Date(second.createdAt).getTime(),
    );

    for (const reading of orderedTelemetry) {
      const value = this.valueFor(reading);

      if (value === null) {
        continue;
      }

      const deviceName = this.getDeviceName(reading);
      const points = groupedReadings.get(deviceName) ?? [];
      points.push({
        x: new Date(reading.createdAt).getTime(),
        y: value,
      });
      groupedReadings.set(deviceName, points);
    }

    const metric = this.selectedMetricDefinition;
    const series = Array.from(groupedReadings.entries()).map(
      ([name, data]) => ({
        name,
        data,
      }),
    );

    this.chartOptions = {
      ...this.chartOptions,
      series,
      noData: {
        text: 'Sin datos para esta seleccion',
        align: 'center',
        verticalAlign: 'middle',
        style: {
          color: '#6c757d',
          fontSize: '14px',
        },
      },
      tooltip: {
        x: {
          format: 'HH:mm:ss',
        },
        y: {
          formatter: (value: number) =>
            `${value.toFixed(2)} ${metric.unit}`,
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

  private createChartOptions(): ChartOptions {
    return {
      series: [],
      chart: {
        type: 'line',
        height: 360,
        animations: {
          enabled: true,
        },
        toolbar: {
          show: false,
        },
        zoom: {
          enabled: false,
        },
      },
      colors: ['#198754', '#0d6efd', '#fd7e14', '#dc3545', '#6f42c1', '#20c997'],
      dataLabels: {
        enabled: false,
      },
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
