import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class EmailAttachmentDto {
  @IsString()
  @IsNotEmpty()
  filename!: string;

  @IsString()
  @IsNotEmpty()
  content!: string;

  @IsString()
  @IsOptional()
  contentType?: string;

  @IsString()
  @IsOptional()
  encoding?: string;
}
