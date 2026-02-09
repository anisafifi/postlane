import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  Post,
  Req,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AnyFilesInterceptor } from '@nestjs/platform-express';
import type { Request } from 'express';
import { BulkSendEmailDto } from './dto/bulk-email.dto';
import { SendEmailDto } from './dto/send-email.dto';
import { EmailService } from './email.service';
import { SmtpConfigDto } from './dto/smtp-config.dto';

@Controller({ path: 'email', version: '1' })
export class EmailController {
  constructor(private readonly emailService: EmailService) {}

  @Post('send')
  @Throttle({ default: { limit: 60, ttl: 60 } })
  @HttpCode(200)
  sendSingle(@Body() dto: SendEmailDto, @Req() req: Request) {
    return this.emailService.sendSingle(dto, this.buildMeta(req));
  }

  @Post('send/bulk')
  @Throttle({ default: { limit: 10, ttl: 60 } })
  @HttpCode(200)
  sendBulk(@Body() dto: BulkSendEmailDto, @Req() req: Request) {
    return this.emailService.sendBulk(dto, this.buildMeta(req));
  }

  @Post('send/multipart')
  @Throttle({ default: { limit: 60, ttl: 60 } })
  @UseInterceptors(AnyFilesInterceptor())
  @HttpCode(200)
  sendSingleMultipart(
    @UploadedFiles() files: Express.Multer.File[],
    @Req() req: Request,
  ) {
    const payload = this.parseMultipartSingle(req.body, files);
    return this.emailService.sendSingle(payload, this.buildMeta(req));
  }

  @Post('send/bulk/multipart')
  @Throttle({ default: { limit: 10, ttl: 60 } })
  @UseInterceptors(AnyFilesInterceptor())
  @HttpCode(200)
  sendBulkMultipart(
    @UploadedFiles() files: Express.Multer.File[],
    @Req() req: Request,
  ) {
    const payload = this.parseMultipartBulk(req.body, files);
    const attachmentsByIndex = this.mapFilesToBulkAttachments(files);

    payload.emails = (payload.emails ?? []).map((item, index) => {
      const attachments = attachmentsByIndex.get(index);
      return attachments ? { ...item, attachments } : item;
    });

    return this.emailService.sendBulk(payload, this.buildMeta(req));
  }

  private buildMeta(req: Request) {
    const apiKeyHash = (req as Request & { apiKeyHash?: string }).apiKeyHash;
    const requestId = this.normalizeRequestId(req.id);
    return {
      requestId,
      apiKeyHash,
    };
  }

  private normalizeRequestId(value: Request['id']) {
    if (typeof value === 'string' || typeof value === 'number') {
      return value;
    }

    if (value && typeof value === 'object' && 'toString' in value) {
      return value.toString();
    }

    return undefined;
  }

  private parsePayload<T>(payloadValue: unknown) {
    if (!payloadValue) {
      throw new BadRequestException('payload is required for multipart');
    }

    if (typeof payloadValue === 'string') {
      try {
        return JSON.parse(payloadValue) as T;
      } catch (error) {
        throw new BadRequestException('payload must be valid JSON');
      }
    }

    if (typeof payloadValue === 'object') {
      return payloadValue as T;
    }

    throw new BadRequestException('payload must be valid JSON');
  }

  private parseMultipartSingle(
    body: Record<string, unknown>,
    files: Express.Multer.File[],
  ): SendEmailDto {
    if (body?.payload) {
      const payload = this.parsePayload<SendEmailDto>(body.payload);
      return {
        ...payload,
        attachments: this.mapFilesToAttachments(files) ?? payload.attachments,
      };
    }

    const to = this.parseString(body?.to);
    const subject = this.parseString(body?.subject);
    const text = this.parseString(body?.text);
    const html = this.parseString(body?.html);
    const from = this.parseString(body?.from);
    const smtp = this.parseSmtpFromBody(body);

    if (!to || !subject) {
      throw new BadRequestException('to and subject are required');
    }

    return {
      to,
      subject,
      text,
      html,
      from,
      smtp,
      attachments: this.mapFilesToAttachments(files),
    } satisfies SendEmailDto;
  }

  private parseMultipartBulk(
    body: Record<string, unknown>,
    files: Express.Multer.File[],
  ): BulkSendEmailDto {
    if (body?.payload) {
      return this.parsePayload<BulkSendEmailDto>(body.payload);
    }

    const emailsValue = body?.emails;
    if (!emailsValue) {
      throw new BadRequestException('emails is required for bulk multipart');
    }

    const emails = this.parseJson(emailsValue);
    if (!Array.isArray(emails)) {
      throw new BadRequestException('emails must be a JSON array');
    }

    return {
      emails,
      from: this.parseString(body?.from),
      smtp: this.parseSmtpFromBody(body),
    } satisfies BulkSendEmailDto;
  }

  private parseSmtpFromBody(
    body: Record<string, unknown>,
  ): SmtpConfigDto | undefined {
    if (body?.smtp) {
      return this.parseJson(body.smtp) as SmtpConfigDto;
    }

    const host = this.parseString(body?.smtp_host ?? body?.smtpHost);
    const portValue = body?.smtp_port ?? body?.smtpPort;
    const user = this.parseString(body?.smtp_user ?? body?.smtpUser);
    const pass = this.parseString(body?.smtp_pass ?? body?.smtpPass);
    const secureValue = body?.smtp_secure ?? body?.smtpSecure;

    if (!host || !portValue || !user || !pass) {
      return undefined;
    }

    const port = this.parseNumber(portValue);
    if (!port) {
      throw new BadRequestException('smtp_port must be a number');
    }

    return {
      host,
      port,
      secure: this.parseBoolean(secureValue),
      user,
      pass,
    } satisfies SmtpConfigDto;
  }

  private parseString(value: unknown) {
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim();
    }

    return undefined;
  }

  private parseNumber(value: unknown) {
    if (typeof value === 'number') {
      return value;
    }

    if (typeof value === 'string' && value.trim().length > 0) {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : undefined;
    }

    return undefined;
  }

  private parseBoolean(value: unknown) {
    if (typeof value === 'boolean') {
      return value;
    }

    if (typeof value === 'string') {
      return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
    }

    return false;
  }

  private parseJson(value: unknown) {
    if (typeof value === 'string') {
      try {
        return JSON.parse(value) as unknown;
      } catch (error) {
        throw new BadRequestException('payload must be valid JSON');
      }
    }

    if (typeof value === 'object') {
      return value as unknown;
    }

    throw new BadRequestException('payload must be valid JSON');
  }

  private mapFilesToAttachments(files?: Express.Multer.File[]) {
    if (!files?.length) {
      return undefined;
    }

    return files.map((file) => ({
      filename: file.originalname,
      content: file.buffer.toString('base64'),
      contentType: file.mimetype,
      encoding: 'base64',
    }));
  }

  private mapFilesToBulkAttachments(files?: Express.Multer.File[]) {
    const map = new Map<number, ReturnType<typeof this.mapFilesToAttachments>>();
    if (!files?.length) {
      return map;
    }

    files.forEach((file) => {
      const match = file.fieldname.match(/^attachments\[(\d+)]/);
      if (!match) {
        return;
      }

      const index = Number(match[1]);
      if (!Number.isInteger(index)) {
        return;
      }

      const existing = map.get(index) ?? [];
      existing.push({
        filename: file.originalname,
        content: file.buffer.toString('base64'),
        contentType: file.mimetype,
        encoding: 'base64',
      });
      map.set(index, existing);
    });

    return map;
  }
}
