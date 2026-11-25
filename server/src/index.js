import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { z } from 'zod';
import { fetchEyeCareProduct } from './adapters/eyeCareCartpe.js';

const app = express();
const port = Number(process.env.PORT || 4000);
const allowedOrigins = (process.env.CLIENT_ORIGIN || 'http://localhost:5173').split(',').map((s) => s.trim());
const supplierHost = 'eye-care.cartpe.shop';

app.disable('x-powered-by');
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: allowedOrigins, methods: ['GET', 'POST'], allowedHeaders: ['Content-Type'] }));
app.use(express.json({ limit: '20kb' }));

const inputSchema = z.object({ url: z.string().url().max(2048) });

function validateSupplierUrl(raw) {
  const url = new URL(raw);
  const portNumber = Number(url.port || (url.protocol === 'https:' ? 443 : 80));
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || ![80, 443].includes(portNumber)) {
    throw new Error('Please enter a valid public product URL.');
  }
  if (url.hostname.toLowerCase() !== supplierHost) {
    throw new Error(`Phase 1 currently supports only ${supplierHost}.`);
  }
  if (!url.pathname.startsWith('/product-detail/')) {
    throw new Error('Please enter a valid Eye-Care Cartpe product detail URL.');
  }
  return url;
}

app.get('/api/health', (_req, res) => res.json({ status: 'ok', phase: 1, supportedSuppliers: [supplierHost] }));

app.post('/api/fetch-product', async (req, res) => {
  const parsed = inputSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Please enter a valid product URL.' });
  try {
    const url = validateSupplierUrl(parsed.data.url);
    const product = await fetchEyeCareProduct(url.href);
    if (!product.title && product.price == null && product.images.length === 0) {
      return res.status(422).json({
        error: 'Could not identify product details from the Eye-Care Cartpe product API.',
        details: product.warnings
      });
    }
    return res.json({ product });
  } catch (error) {
    const message = error.message || 'Product could not be fetched.';
    const status = message.startsWith('Phase 1') || message.startsWith('Please enter') ? 400 : 502;
    console.error('Eye-Care Cartpe fetch failed:', message);
    return res.status(status).json({ error: message });
  }
});

app.use((error, _req, res, _next) => {
  console.error('Unhandled API error:', error);
  res.status(500).json({ error: 'Unexpected server error. Please try again.' });
});

app.listen(port, () => console.log(`Auto Listing API listening on port ${port}`));
