import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { z } from 'zod';
import { extractEyeCareProduct } from './adapters/eyeCareCartpe.js';

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
  return url;
}

async function fetchSupplierPage(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      redirect: 'manual',
      headers: {
        'User-Agent': 'AutoListingProductPreview/1.0',
        Accept: 'text/html,application/xhtml+xml'
      }
    });
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      throw new Error('The supplier redirected this URL. Please use the final product URL directly.');
    }
    if (!response.ok) throw new Error(`Supplier page returned HTTP ${response.status}.`);
    const type = response.headers.get('content-type') || '';
    if (!type.includes('text/html') && !type.includes('application/xhtml+xml')) {
      throw new Error('The supplied link did not return an HTML product page.');
    }
    const reader = response.body.getReader();
    const chunks = [];
    let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 4 * 1024 * 1024) {
        await reader.cancel();
        throw new Error('The supplier page is larger than the 4 MB fetch limit.');
      }
      chunks.push(value);
    }
    return Buffer.concat(chunks).toString('utf8');
  } catch (error) {
    if (error.name === 'AbortError') throw new Error('The supplier page took too long to respond. Please try again.');
    throw error;
  } finally { clearTimeout(timer); }
}

app.get('/api/health', (_req, res) => res.json({ status: 'ok', phase: 1, supportedSuppliers: [supplierHost] }));

app.post('/api/fetch-product', async (req, res) => {
  const parsed = inputSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Please enter a valid product URL.' });
  try {
    const url = validateSupplierUrl(parsed.data.url);
    const html = await fetchSupplierPage(url.href);
    const product = extractEyeCareProduct(html, url.href);
    if (!product.title && product.price == null && product.images.length === 0) {
      return res.status(422).json({
        error: 'Could not identify product details in this page. It may require JavaScript or block automated requests.',
        details: product.warnings
      });
    }
    return res.json({ product });
  } catch (error) {
    const message = error.message || 'Product could not be fetched.';
    const status = message.startsWith('Phase 1') || message.startsWith('Please enter') ? 400 : 502;
    return res.status(status).json({ error: message });
  }
});

app.use((error, _req, res, _next) => {
  console.error('Unhandled API error:', error);
  res.status(500).json({ error: 'Unexpected server error. Please try again.' });
});

app.listen(port, () => console.log(`Auto Listing API listening on port ${port}`));
