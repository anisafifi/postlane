import { Module } from '@nestjs/common';
import { PinoLoggerService } from '../logger/pino-logger.service';
import { MetricsController } from './metrics.controller';
import { MetricsService } from './metrics.service';

@Module({
  controllers: [MetricsController],
  providers: [MetricsService, PinoLoggerService],
  exports: [MetricsService, PinoLoggerService],
})
export class MetricsModule {}
