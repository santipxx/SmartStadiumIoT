import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AlertsService } from './alerts.service';
import { AlertsController } from './alerts.controller';
import { Alert } from './alert.entity';
import { AlertRule } from './alert-rule.entity';
import { Device } from '../devices/device.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Alert, AlertRule, Device])],
  controllers: [AlertsController],
  providers: [AlertsService],
  exports: [AlertsService],
})
export class AlertsModule { }
