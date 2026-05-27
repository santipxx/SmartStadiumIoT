import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { TelemetryService } from './telemetry.service';
import { TelemetryController } from './telemetry.controller';
import { Telemetry } from './telemetry.entity';
import { Device } from '../devices/device.entity';
import { AlertsModule } from '../alerts/alerts.module';

@Module({
  imports: [TypeOrmModule.forFeature([Telemetry, Device]), AlertsModule],
  controllers: [TelemetryController],
  providers: [TelemetryService],
  exports: [TelemetryService],
})
export class TelemetryModule { }
