import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SmtpConfigDto } from '../dto/smtp-config.dto';

export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
}

@Injectable()
export class SmtpResolver {
  constructor(private readonly configService: ConfigService) {}

  resolve(dto?: SmtpConfigDto): SmtpConfig {
    if (dto) {
      return dto;
    }

    const host = this.configService.get<string>('SMTP_HOST');
    const portValue = this.configService.get<string>('SMTP_PORT');
    const secureValue = this.configService.get<string>('SMTP_SECURE');
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASS');

    if (!host || !portValue || !user || !pass) {
      throw new BadRequestException('SMTP configuration is required');
    }

    const port = Number(portValue);
    if (!Number.isInteger(port) || port <= 0) {
      throw new BadRequestException('SMTP_PORT must be a valid number');
    }

    const secure = this.parseSecure(secureValue);

    return {
      host,
      port,
      secure,
      user,
      pass,
    };
  }

  private parseSecure(value?: string) {
    if (!value) {
      return false;
    }

    return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
  }
}
