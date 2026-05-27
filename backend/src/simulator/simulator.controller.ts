import { Body, Controller, Delete, Get, Post } from '@nestjs/common';

import { SimulatorService } from './simulator.service';

@Controller('simulator')
export class SimulatorController {
  constructor(private readonly simulatorService: SimulatorService) { }

  @Get('status')
  getStatus() {
    return this.simulatorService.getStatus();
  }

  @Post('start')
  start(@Body() body: { intervalMs?: number }) {
    return this.simulatorService.start(Number(body?.intervalMs));
  }

  @Post('stop')
  stop() {
    return this.simulatorService.stop();
  }

  @Post('tick')
  sendBatchNow() {
    return this.simulatorService.sendBatchNow();
  }

  @Post('targets')
  setTargets(@Body() body: { deviceIds?: number[] }) {
    return this.simulatorService.setTargets(body?.deviceIds ?? []);
  }

  @Delete('targets')
  clearTargets() {
    return this.simulatorService.clearTargets();
  }
}
