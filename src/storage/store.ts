import { EventEmitter } from 'events';
import { StoredEmail, EmailSummary } from '../types';

class EmailStore extends EventEmitter {
  private emails: StoredEmail[] = [];

  add(email: StoredEmail): void {
    this.emails.unshift(email);
    this.emit('email:added', email.id);
  }

  getAll(): EmailSummary[] {
    return this.emails.map(({ html, text, raw, ...summary }) => summary);
  }

  getById(id: string): StoredEmail | undefined {
    return this.emails.find(e => e.id === id);
  }

  delete(id: string): boolean {
    const idx = this.emails.findIndex(e => e.id === id);
    if (idx === -1) return false;
    this.emails.splice(idx, 1);
    return true;
  }

  deleteAll(): void {
    this.emails = [];
  }
}

export const store = new EmailStore();
