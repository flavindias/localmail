# localmail

A local SMTP mail catcher with a web UI. Point your app's mailer at it during development and inspect every email in the browser — no external service needed.

## Quick start

```bash
docker-compose up --build
```

Open http://localhost:6245 to see the inbox.

> **Tip:** If port 6245 is taken, change the host port in `docker-compose.yml`:
> ```yaml
> ports:
>   - "YOUR_PORT:3000"
> ```
> Then restart with `docker-compose down && docker-compose up`.

## Usage

Configure your app to send email via SMTP to:

| Setting | Value |
|---------|-------|
| Host | `localhost` |
| Port | `1025` |
| Auth | none |
| TLS | none |

All emails are captured and never delivered to real recipients.

**Nodemailer**
```js
const transporter = nodemailer.createTransport({ host: 'localhost', port: 1025 });
```

**Python / Django**
```python
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = 'localhost'
EMAIL_PORT = 1025
```

**Rails / Action Mailer**
```ruby
config.action_mailer.smtp_settings = { address: 'localhost', port: 1025 }
```

## Web UI

- Inbox sidebar with sender, subject, and preview
- HTML and plain-text body tabs
- View raw SMTP source
- Search by sender or subject
- Delete individual messages or clear all
- Live updates via Server-Sent Events — no page refresh needed

## REST API

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/messages` | List all messages (metadata only) |
| `GET` | `/api/messages/:id` | Full message including body |
| `GET` | `/api/messages/:id/html` | HTML body as `text/html` |
| `GET` | `/api/messages/:id/source` | Raw SMTP source as `text/plain` |
| `DELETE` | `/api/messages/:id` | Delete a single message |
| `DELETE` | `/api/messages` | Delete all messages |
| `GET` | `/api/events` | SSE stream — emits `email:added` events |

## Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `SMTP_PORT` | `1025` | SMTP server port |
| `API_PORT` | `3000` | Web UI and API port |

## Local development

```bash
npm install
npm run dev
```

Requires Node.js 20+.

## Docker

Build and run with Docker Compose:

```bash
docker-compose up --build
```

Or build the image directly:

```bash
docker build -t localmail .
docker run -p 1025:1025 -p 3000:3000 localmail
```

Emails are stored in memory and cleared when the container restarts.
