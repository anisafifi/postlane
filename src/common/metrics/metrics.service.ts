import { Injectable } from '@nestjs/common';
import { Counter, Histogram, collectDefaultMetrics, register } from 'prom-client';

@Injectable()
export class MetricsService {
  private readonly sentCounter: Counter<string>;
  private readonly failedCounter: Counter<string>;
  private readonly latencyHistogram: Histogram<string>;

  constructor() {
    collectDefaultMetrics({ register });

    this.sentCounter = new Counter({
      name: 'emails_sent_total',
      help: 'Total number of emails sent',
      registers: [register],
    });

    this.failedCounter = new Counter({
      name: 'emails_failed_total',
      help: 'Total number of email send failures',
      registers: [register],
    });

    this.latencyHistogram = new Histogram({
      name: 'smtp_latency_ms',
      help: 'SMTP send latency in milliseconds',
      buckets: [50, 100, 250, 500, 1000, 2000, 5000],
      registers: [register],
    });
  }

  recordSent(count: number) {
    this.sentCounter.inc(count);
  }

  recordFailed(count: number) {
    this.failedCounter.inc(count);
  }

  recordLatency(durationMs: number) {
    this.latencyHistogram.observe(durationMs);
  }

  async getMetrics() {
    return register.metrics();
  }
}
