import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CommandsService } from './commands.service';
import { CommandsController } from './commands.controller';
import { Command } from './command.entity';
import { Device } from '../devices/device.entity';
import { SensorConfigsModule } from '../sensor-configs/sensor-configs.module';

@Module({
  imports: [TypeOrmModule.forFeature([Command, Device]), SensorConfigsModule],
  controllers: [CommandsController],
  providers: [CommandsService],
})
export class CommandsModule { }
