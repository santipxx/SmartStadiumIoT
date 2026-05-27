import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Device } from '../devices/device.entity';
import { SensorConfigsModule } from '../sensor-configs/sensor-configs.module';
import { TelemetryModule } from '../telemetry/telemetry.module';
import { SimulatorController } from './simulator.controller';
import { SimulatorService } from './simulator.service';

@Module({
  imports: [TypeOrmModule.forFeature([Device]), TelemetryModule, SensorConfigsModule],
  controllers: [SimulatorController],
  providers: [SimulatorService],
})
export class SimulatorModule { }
