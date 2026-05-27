import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { SensorConfig } from './sensor-config.entity';
import { SensorConfigsController } from './sensor-configs.controller';
import { SensorConfigsService } from './sensor-configs.service';

@Module({
  imports: [TypeOrmModule.forFeature([SensorConfig])],
  controllers: [SensorConfigsController],
  providers: [SensorConfigsService],
  exports: [SensorConfigsService],
})
export class SensorConfigsModule { }
