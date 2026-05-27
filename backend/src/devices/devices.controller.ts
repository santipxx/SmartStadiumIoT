import { Body, Controller, Get, Param, Patch } from '@nestjs/common';
import { DevicesService } from './devices.service';

@Controller('devices')
export class DevicesController {
    constructor(private readonly devicesService: DevicesService) { }

    @Get()
    findAll() {
        return this.devicesService.findAll();
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.devicesService.findOne(Number(id));
    }

    @Patch(':id/status')
    updateStatus(@Param('id') id: string, @Body() body: { status: string }) {
        return this.devicesService.updateStatus(Number(id), body.status);
    }
}
