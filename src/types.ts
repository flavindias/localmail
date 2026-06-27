export interface Attachment {
  filename: string;
  contentType: string;
  size: number;
}

export interface StoredEmail {
  id: string;
  from: string;
  to: string[];
  subject: string;
  date: string;
  html: string | null;
  text: string | null;
  raw: string;
  size: number;
  attachments: Attachment[];
}

export type EmailSummary = Omit<StoredEmail, 'html' | 'text' | 'raw'>;
