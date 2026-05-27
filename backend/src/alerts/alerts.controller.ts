import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { AlertsService } from './alerts.service';

@Controller('alerts')
export class AlertsController {
    constructor(private readonly alertsService: AlertsService) { }

    @Get('rules')
    findRules() {
        return this.alertsService.findRules();
    }

    @Post('rules')
    createRule(@Body() body: any) {
        return this.alertsService.createRule(body);
    }

    @Patch('rules/:id')
    updateRule(@Param('id') id: string, @Body() body: any) {
        return this.alertsService.updateRule(Number(id), body);
    }

    @Delete('rules/:id')
    deleteRule(@Param('id') id: string) {
        return this.alertsService.deleteRule(Number(id));
    }

    @Get()
    findAll() {
        return this.alertsService.findAll();
    }

    @Get('device/:id')
    findByDevice(@Param('id') id: string) {
        return this.alertsService.findByDevice(Number(id));
    }
}
