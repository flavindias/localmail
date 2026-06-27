import { startSmtpServer } from './smtp/server';
import { startApiServer } from './api/server';

const SMTP_PORT = parseInt(process.env.SMTP_PORT ?? '1025', 10);
const API_PORT = parseInt(process.env.API_PORT ?? '6245', 10);

startSmtpServer(SMTP_PORT);
startApiServer(API_PORT, SMTP_PORT)
  .then(() => {
    console.log('LocalMail running');
    console.log(`  SMTP:   port ${SMTP_PORT}`);
    console.log(`  Web UI: http://localhost:${API_PORT}`);
    console.log(`  API:    http://localhost:${API_PORT}/api/messages`);
  })
  .catch(() => process.exit(1));
