import { Controller, Get, Param } from '@nestjs/common';

import { SensorConfigsService } from './sensor-configs.service';

@Controller('sensor-configs')
export class SensorConfigsController {
  constructor(private readonly sensorConfigsService: SensorConfigsService) { }

  @Get()
  findAll() {
    return this.sensorConfigsService.findAll();
  }

  @Get('device/:id')
  findByDevice(@Param('id') id: string) {
    return this.sensorConfigsService.findByDevice(Number(id));
  }
}
