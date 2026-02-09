import { Injectable } from '@nestjs/common';
import pino, { Logger } from 'pino';

@Injectable()
export class PinoLoggerService {
  private readonly logger: Logger;

  constructor() {
    this.logger = pino({
      level: process.env.LOG_LEVEL ?? 'info',
    });
  }

  info(message: string, meta?: Record<string, unknown>) {
    if (meta) {
      this.logger.info(meta, message);
      return;
    }

    this.logger.info(message);
  }

  error(message: string, meta?: Record<string, unknown>) {
    if (meta) {
      this.logger.error(meta, message);
      return;
    }

    this.logger.error(message);
  }
}
