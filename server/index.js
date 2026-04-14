import 'dotenv/config';

// Keep the process alive and log clearly instead of crashing silently
process.on('unhandledRejection', (reason) => {
  console.error('[unhandledRejection]', reason);
});
process.on('uncaughtException', (err) => {
  console.error('[uncaughtException]', err);
});

import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import parseReceiptRouter from './routes/parse-receipt.js';
import saveReceiptRouter from './routes/save-receipt.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Routes
app.use('/api', parseReceiptRouter);
app.use('/api', saveReceiptRouter);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// In production, serve the Vite build
if (process.env.NODE_ENV === 'production') {
  const distPath = join(__dirname, '..', 'dist');
  app.use(express.static(distPath));
  app.get('*', (_req, res) => {
    res.sendFile(join(distPath, 'index.html'));
  });
}

// Global error handler — must be last and have exactly 4 params for Express to treat it as an error handler
// Catches multer errors, unhandled promise rejections forwarded via next(err), etc.
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error('Unhandled server error:', err);
  const status = err.status || err.statusCode || 500;
  res.status(status).json({ error: err.message || 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
