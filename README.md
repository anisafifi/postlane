# Postlane SMTP Email API

Postlane is a stateless NestJS API for sending single or bulk email through SMTP with API key authentication and header-based versioning. It supports JSON payloads and multipart uploads for attachments.

## Tech Stack

- Node.js + TypeScript
- NestJS
- Nodemailer
- Pino (logging)
- Prometheus (prom-client)

## Features

- Send single or bulk email
- SMTP per-request or via environment variables
- JSON and multipart/form-data attachments
- API key auth + header versioning
- Rate limiting
- Health and Prometheus metrics endpoints
- Request logging with redaction

## Quick Start

```bash
pnpm install
pnpm run start:dev
```

## Configuration

Copy the example env file and fill in values:

```bash
cp .env.example .env
```

Required:

- POSTLANE_API_KEY
- SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS (unless provided per request)

Optional:

- SMTP_SECURE (true/false)
- EMAIL_FROM
- CORS_ORIGINS (comma-separated)
- PORT
- LOG_LEVEL

## Authentication

Every protected request must include:

- Authorization: Bearer <POSTLANE_API_KEY>
- x-postlane-version: v1

## Endpoints

Public:

- GET / (service info)
- GET /health
- GET /metrics

Protected:

- POST /email/send
- POST /email/send/bulk
- POST /email/send/multipart
- POST /email/send/bulk/multipart

## JSON API Examples

### Send Single Email

```bash
curl -X POST http://localhost:3000/email/send \
  -H "Authorization: Bearer $POSTLANE_API_KEY" \
  -H "x-postlane-version: v1" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "user@example.com",
    "subject": "Hello",
    "text": "Plain text body",
    "html": "<b>Hello</b>",
    "smtp": {
      "host": "smtp.example.com",
      "port": 587,
      "secure": false,
      "user": "smtp_user",
      "pass": "smtp_pass"
    },
    "attachments": [
      {
        "filename": "report.pdf",
        "content": "<base64-content>",
        "contentType": "application/pdf",
        "encoding": "base64"
      }
    ]
  }'
```

### Send Bulk Email

```bash
curl -X POST http://localhost:3000/email/send/bulk \
  -H "Authorization: Bearer $POSTLANE_API_KEY" \
  -H "x-postlane-version: v1" \
  -H "Content-Type: application/json" \
  -d '{
    "emails": [
      { "to": "a@test.com", "subject": "Hi", "text": "Hi" },
      { "to": "b@test.com", "subject": "Hi", "html": "<p>Hi</p>" }
    ]
  }'
```

## Multipart API Examples

Multipart endpoints accept either a form field named `payload` containing JSON, or flat form-data fields like `to`, `subject`, `text`, `html`, and `from`. Files are uploaded as normal form fields.

### Send Single Multipart

```bash
curl -X POST http://localhost:3000/email/send/multipart \
  -H "Authorization: Bearer $POSTLANE_API_KEY" \
  -H "x-postlane-version: v1" \
  -F "payload={\"to\":\"user@example.com\",\"subject\":\"Hello\",\"text\":\"Hi\"};type=application/json" \
  -F "attachments=@./report.pdf"
```

Flat form-data example:

```bash
curl -X POST http://localhost:3000/email/send/multipart \
  -H "Authorization: Bearer $POSTLANE_API_KEY" \
  -H "x-postlane-version: v1" \
  -F "to=user@example.com" \
  -F "subject=Hello" \
  -F "text=Hi" \
  -F "attachments=@./report.pdf"
```

### Send Bulk Multipart

Use file field names `attachments[0]`, `attachments[1]`, etc. to map files to email items by index. For flat form-data, provide `emails` as a JSON array in a text field.

```bash
curl -X POST http://localhost:3000/email/send/bulk/multipart \
  -H "Authorization: Bearer $POSTLANE_API_KEY" \
  -H "x-postlane-version: v1" \
  -F "payload={\"emails\":[{\"to\":\"a@test.com\",\"subject\":\"Hi\",\"text\":\"Hi\"},{\"to\":\"b@test.com\",\"subject\":\"Hi\",\"text\":\"Hi\"}]};type=application/json" \
  -F "attachments[0]=@./a.pdf" \
  -F "attachments[1]=@./b.pdf"
```

## Observability

- Logs redact `Authorization` headers.
- Metrics exposed at `/metrics`.

## License

MIT. See LICENSE.
