import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

import { Device, DevicesService } from '../../services/devices';

@Component({
  selector: 'app-devices',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './devices.html',
  styleUrl: './devices.css',
})
export class Devices implements OnInit {
  devices: Device[] = [];
  loading = true;
  error = '';

  constructor(private devicesService: DevicesService) { }

  ngOnInit(): void {
    this.devicesService.getDevices().subscribe({
      next: (data) => {
        this.devices = data;
        this.loading = false;
      },
      error: () => {
        this.error = 'No se pudieron cargar los dispositivos.';
        this.loading = false;
      },
    });
  }
}