import { SMTPServer } from 'smtp-server';
import { simpleParser } from 'mailparser';
import { v4 as uuidv4 } from 'uuid';
import { store } from '../storage/store';
import { StoredEmail } from '../types';

export function startSmtpServer(port: number): void {
  const server = new SMTPServer({
    authOptional: true,
    allowInsecureAuth: true,
    disabledCommands: ['STARTTLS'],
    onData(stream, session, callback) {
      const chunks: Buffer[] = [];
      stream.on('data', (chunk: Buffer) => chunks.push(chunk));
      stream.on('end', async () => {
        try {
          const raw = Buffer.concat(chunks);
          const parsed = await simpleParser(raw);

          const from =
            (parsed.from?.value[0]?.address ?? session.envelope.mailFrom
              ? (session.envelope.mailFrom as { address: string }).address
              : 'unknown');

          const to = parsed.to
            ? (Array.isArray(parsed.to) ? parsed.to : [parsed.to])
                .flatMap(a => a.value.map(v => v.address ?? ''))
                .filter(Boolean)
            : session.envelope.rcptTo.map(r => r.address);

          const attachments = (parsed.attachments ?? []).map(att => ({
            filename: att.filename ?? 'attachment',
            contentType: att.contentType,
            size: att.size,
          }));

          const email: StoredEmail = {
            id: uuidv4(),
            from,
            to,
            subject: parsed.subject ?? '(no subject)',
            date: (parsed.date ?? new Date()).toISOString(),
            html: parsed.html !== false ? (parsed.html as string) : null,
            text: parsed.text ?? null,
            raw: raw.toString('utf-8'),
            size: raw.length,
            attachments,
          };

          store.add(email);
          console.log(`[SMTP] Received: "${email.subject}" from ${email.from}`);
          callback();
        } catch (err) {
          console.error('[SMTP] Parse error:', err);
          callback(new Error('Failed to parse message'));
        }
      });
      stream.on('error', callback);
    },
  });

  server.listen(port, () => {
    console.log(`[SMTP] Listening on port ${port}`);
  });

  server.on('error', (err: Error) => {
    console.error('[SMTP] Server error:', err);
  });
}
