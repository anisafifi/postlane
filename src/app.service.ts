import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getInfo() {
    return {
      name: 'Postlane SMTP Email API',
      description:
        'Send single or bulk email via SMTP with API key auth and header-based versioning.',
      versionHeader: 'x-postlane-version: v1',
      authHeader: 'Authorization: Bearer <POSTLANE_API_KEY>',
      endpoints: [
        { method: 'GET', path: '/health', auth: 'none' },
        { method: 'GET', path: '/metrics', auth: 'none' },
        { method: 'POST', path: '/email/send', auth: 'required' },
        { method: 'POST', path: '/email/send/bulk', auth: 'required' },
        { method: 'POST', path: '/email/send/multipart', auth: 'required' },
        { method: 'POST', path: '/email/send/bulk/multipart', auth: 'required' },
      ],
      notes: [
        'Provide SMTP in request body or via environment variables.',
        'Include text or html in each email payload.',
        'Multipart endpoints expect a form field named payload containing JSON.',
        'Bulk multipart files use field names like attachments[0].',
      ],
    };
  }

  getHealth() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }
}
