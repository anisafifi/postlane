import { Injectable } from '@nestjs/common';
import nodemailer, { Transporter } from 'nodemailer';
import { SmtpConfig } from './smtp.resolver';

@Injectable()
export class SmtpTransport {
  private readonly transportCache = new Map<string, Transporter>();

  getTransport(config: SmtpConfig): Transporter {
    const key = this.getCacheKey(config);
    const cached = this.transportCache.get(key);
    if (cached) {
      return cached;
    }

    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: {
        user: config.user,
        pass: config.pass,
      },
      pool: true,
      maxConnections: 5,
      maxMessages: 100,
    });

    this.transportCache.set(key, transporter);
    return transporter;
  }

  private getCacheKey(config: SmtpConfig) {
    return `${config.host}:${config.port}:${config.secure}:${config.user}:${config.pass}`;
  }
}
