import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PinoLoggerService } from '../common/logger/pino-logger.service';
import { MetricsService } from '../common/metrics/metrics.service';
import { BulkSendEmailDto, BulkEmailItemDto } from './dto/bulk-email.dto';
import { SendEmailDto } from './dto/send-email.dto';
import { SmtpResolver } from './smtp/smtp.resolver';
import { SmtpTransport } from './smtp/smtp.transport';

interface RequestMeta {
  requestId?: string | number;
  apiKeyHash?: string;
}

@Injectable()
export class EmailService {
  constructor(
    private readonly configService: ConfigService,
    private readonly logger: PinoLoggerService,
    private readonly metrics: MetricsService,
    private readonly smtpResolver: SmtpResolver,
    private readonly smtpTransport: SmtpTransport,
  ) {}

  async sendSingle(dto: SendEmailDto, meta: RequestMeta = {}) {
    this.ensureContent(dto.text, dto.html);

    const smtpConfig = this.smtpResolver.resolve(dto.smtp);
    const transporter = this.smtpTransport.getTransport(smtpConfig);
    const from = this.resolveFrom(dto.from, smtpConfig.user);
    const startTime = Date.now();

    try {
      const result = await transporter.sendMail({
        to: dto.to,
        subject: dto.subject,
        text: dto.text,
        html: dto.html,
        from,
        attachments: this.buildAttachments(dto.attachments),
      });

      this.metrics.recordSent(1);
      this.metrics.recordLatency(Date.now() - startTime);
      this.logger.info('email.send', {
        ...meta,
        emailCount: 1,
        smtpHost: this.maskHost(smtpConfig.host),
      });

      return {
        success: true,
        messageId: result.messageId,
        failed: [],
      };
    } catch (error) {
      this.metrics.recordFailed(1);
      this.metrics.recordLatency(Date.now() - startTime);
      this.logger.error('email.send.failed', {
        ...meta,
        emailCount: 1,
        smtpHost: this.maskHost(smtpConfig.host),
        error: this.getErrorMessage(error),
      });
      throw new InternalServerErrorException('Failed to send email');
    }
  }

  async sendBulk(dto: BulkSendEmailDto, meta: RequestMeta = {}) {
    if (!dto.emails?.length) {
      throw new BadRequestException('emails must not be empty');
    }

    const failures: Array<{ index: number; to: string; error: string }> = [];
    let sent = 0;

    for (let index = 0; index < dto.emails.length; index += 1) {
      const item = dto.emails[index];
      try {
        await this.sendBulkItem(item, dto, meta);
        sent += 1;
      } catch (error) {
        failures.push({
          index,
          to: item.to,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return {
      sent,
      failed: failures.length,
      failures,
    };
  }

  private async sendBulkItem(
    item: BulkEmailItemDto,
    dto: BulkSendEmailDto,
    meta: RequestMeta,
  ) {
    this.ensureContent(item.text, item.html);

    const smtpConfig = this.smtpResolver.resolve(item.smtp ?? dto.smtp);
    const transporter = this.smtpTransport.getTransport(smtpConfig);
    const from = this.resolveFrom(item.from ?? dto.from, smtpConfig.user);
    const startTime = Date.now();

    try {
      await transporter.sendMail({
        to: item.to,
        subject: item.subject,
        text: item.text,
        html: item.html,
        from,
        attachments: this.buildAttachments(item.attachments),
      });

      this.metrics.recordSent(1);
      this.metrics.recordLatency(Date.now() - startTime);
    } catch (error) {
      this.metrics.recordFailed(1);
      this.metrics.recordLatency(Date.now() - startTime);
      this.logger.error('email.send.failed', {
        ...meta,
        emailCount: 1,
        smtpHost: this.maskHost(smtpConfig.host),
        error: this.getErrorMessage(error),
      });
      throw error;
    }
  }

  private resolveFrom(explicitFrom?: string, fallbackFrom?: string) {
    const envFrom = this.configService.get<string>('EMAIL_FROM');
    const resolved = explicitFrom ?? envFrom ?? fallbackFrom;
    if (!resolved) {
      throw new BadRequestException('from is required');
    }

    return resolved;
  }

  private ensureContent(text?: string, html?: string) {
    if (!text && !html) {
      throw new BadRequestException('text or html content is required');
    }
  }

  private buildAttachments(
    attachments?: Array<{
      filename: string;
      content: string;
      contentType?: string;
      encoding?: string;
    }>,
  ) {
    if (!attachments?.length) {
      return undefined;
    }

    return attachments.map((attachment) => {
      const encoding = this.normalizeEncoding(attachment.encoding);
      return {
        filename: attachment.filename,
        content: Buffer.from(attachment.content, encoding),
        contentType: attachment.contentType,
        encoding,
      };
    });
  }

  private normalizeEncoding(value?: string): BufferEncoding {
    const fallback: BufferEncoding = 'base64';
    if (!value) {
      return fallback;
    }

    const allowed: BufferEncoding[] = [
      'ascii',
      'base64',
      'base64url',
      'binary',
      'hex',
      'latin1',
      'ucs2',
      'ucs-2',
      'utf8',
      'utf-8',
      'utf16le',
      'utf-16le',
    ];

    return allowed.includes(value as BufferEncoding)
      ? (value as BufferEncoding)
      : fallback;
  }

  private maskHost(host: string) {
    if (!host) {
      return 'unknown';
    }
    if (host.length <= 3) {
      return `${host[0]}***`;
    }

    return `${host[0]}***${host.slice(-2)}`;
  }

  private getErrorMessage(error: unknown) {
    if (error instanceof Error) {
      return error.message;
    }

    return 'Unknown error';
  }
}
