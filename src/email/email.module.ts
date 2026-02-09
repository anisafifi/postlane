import { Module } from '@nestjs/common';
import { MetricsModule } from '../common/metrics/metrics.module';
import { EmailController } from './email.controller';
import { EmailService } from './email.service';
import { SmtpResolver } from './smtp/smtp.resolver';
import { SmtpTransport } from './smtp/smtp.transport';

@Module({
  controllers: [EmailController],
  imports: [MetricsModule],
  providers: [EmailService, SmtpResolver, SmtpTransport],
})
export class EmailModule {}
