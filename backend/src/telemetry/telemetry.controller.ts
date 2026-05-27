import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { TelemetryService } from './telemetry.service';

@Controller('telemetry')
export class TelemetryController {
    constructor(private readonly telemetryService: TelemetryService) { }

    @Post()
    create(@Body() body: any) {
        return this.telemetryService.create(body);
    }

    @Get()
    findAll() {
        return this.telemetryService.findAll();
    }

    @Get('device/:id')
    findByDevice(@Param('id') id: string) {
        return this.telemetryService.findByDevice(Number(id));
    }
}