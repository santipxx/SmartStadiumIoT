import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { DevicesModule } from './devices/devices.module';
import { TelemetryModule } from './telemetry/telemetry.module';
import { AlertsModule } from './alerts/alerts.module';
import { CommandsModule } from './commands/commands.module';
import { SimulatorModule } from './simulator/simulator.module';
import { SensorConfigsModule } from './sensor-configs/sensor-configs.module';


@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const databaseUrl = configService.get<string>('DATABASE_URL');
        const sslMode =
          configService.get<string>('DB_SSL') ??
          configService.get<string>('PGSSLMODE') ??
          'false';
        const useSsl = ['true', 'require'].includes(sslMode.toLowerCase());
        const baseConfig = {
          type: 'postgres' as const,
          autoLoadEntities: true,
          synchronize: configService.get<string>('DB_SYNCHRONIZE') === 'true',
          ...(useSsl ? { ssl: { rejectUnauthorized: false } } : {}),
        };

        if (databaseUrl) {
          return {
            ...baseConfig,
            url: databaseUrl,
          };
        }

        return {
          ...baseConfig,
          host: configService.get<string>('DB_HOST'),
          port: Number(configService.get<string>('DB_PORT') ?? 5432),
          username: configService.get<string>('DB_USERNAME'),
          password: configService.get<string>('DB_PASSWORD'),
          database: configService.get<string>('DB_DATABASE'),
        };
      },
    }),

    DevicesModule,

    TelemetryModule,

    AlertsModule,

    CommandsModule,

    SensorConfigsModule,

    SimulatorModule,
  ],
})
export class AppModule { }
