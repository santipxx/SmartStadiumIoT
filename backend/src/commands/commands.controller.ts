import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { CommandsService } from './commands.service';

@Controller('commands')
export class CommandsController {
    constructor(private readonly commandsService: CommandsService) { }

    @Post()
    create(@Body() body: any) {
        return this.commandsService.create(body);
    }

    @Get()
    findAll() {
        return this.commandsService.findAll();
    }

    @Get('device/:id')
    findByDevice(@Param('id') id: string) {
        return this.commandsService.findByDevice(Number(id));
    }

    @Patch(':id/status')
    updateStatus(@Param('id') id: string, @Body() body: any) {
        return this.commandsService.updateStatus(Number(id), body.status);
    }
}