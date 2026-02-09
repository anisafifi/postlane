import {
  IsArray,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { EmailAttachmentDto } from './attachment.dto';
import { SmtpConfigDto } from './smtp-config.dto';

export class BulkEmailItemDto {
  @IsEmail()
  to!: string;

  @IsString()
  @IsNotEmpty()
  subject!: string;

  @IsString()
  @IsOptional()
  text?: string;

  @IsString()
  @IsOptional()
  html?: string;

  @IsString()
  @IsOptional()
  from?: string;

  @ValidateNested()
  @Type(() => SmtpConfigDto)
  @IsOptional()
  smtp?: SmtpConfigDto;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EmailAttachmentDto)
  @IsOptional()
  attachments?: EmailAttachmentDto[];
}

export class BulkSendEmailDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkEmailItemDto)
  emails!: BulkEmailItemDto[];

  @ValidateNested()
  @Type(() => SmtpConfigDto)
  @IsOptional()
  smtp?: SmtpConfigDto;

  @IsString()
  @IsOptional()
  from?: string;
}
