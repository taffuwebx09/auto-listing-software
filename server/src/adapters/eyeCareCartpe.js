import * as cheerio from 'cheerio';

const clean = (value) => typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';
const absoluteUrl = (value, base) => {
  if (typeof value !== 'string' || !value.trim()) return null;
  try {
    const url = new URL(value.trim(), base);
    if (!['http:', 'https:'].includes(url.protocol)) return null;
    url.hash = '';
    return url.href;
  } catch { return null; }
};

function walkJson(value, found) {
  if (!value || typeof value !== 'object') return;
  if (Array.isArray(value)) return value.forEach((item) => walkJson(item, found));
  const type = value['@type'];
  if (type === 'Product' || (Array.isArray(type) && type.includes('Product'))) found.push(value);
  for (const child of Object.values(value)) walkJson(child, found);
}

function parsePrice(value) {
  if (value == null) return null;
  const match = String(value).replace(/,/g, '').match(/(?:₹|INR|Rs\.?\s*)?\s*(\d+(?:\.\d{1,2})?)/i);
  if (!match) return null;
  const amount = Number(match[1]);
  return Number.isFinite(amount) && amount >= 0 ? amount : null;
}

export function extractEyeCareProduct(html, pageUrl) {
  const $ = cheerio.load(html);
  const jsonProducts = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    try { walkJson(JSON.parse($(el).contents().text()), jsonProducts); } catch { /* malformed supplier JSON-LD */ }
  });
  const product = jsonProducts[0] ?? {};
  const meta = (selector) => clean($(selector).attr('content'));

  const title = clean(product.name) || meta('meta[property="og:title"]') || meta('meta[name="twitter:title"]') || clean($('h1').first().text()) || clean($('title').text());
  const description = clean(product.description) || meta('meta[property="og:description"]') || meta('meta[name="description"]');
  const offers = Array.isArray(product.offers) ? product.offers[0] : product.offers;
  const rawPrice = offers?.price ?? offers?.lowPrice ?? $('[itemprop="price"]').attr('content') ?? meta('meta[property="product:price:amount"]') ?? meta('meta[property="og:price:amount"]');
  const price = parsePrice(rawPrice);
  const currency = clean(offers?.priceCurrency) || meta('meta[property="product:price:currency"]') || 'INR';

  const candidates = [];
  const addImage = (item) => {
    if (typeof item === 'string') candidates.push(item);
    else if (item && typeof item === 'object') {
      if (Array.isArray(item)) item.forEach(addImage);
      else addImage(item.url || item.contentUrl);
    }
  };
  addImage(product.image);
  addImage(meta('meta[property="og:image"]'));
  addImage(meta('meta[name="twitter:image"]'));
  $('[data-zoom-image], [data-large_image], [data-image], img').each((_, el) => {
    const node = $(el);
    ['data-zoom-image', 'data-large_image', 'data-image', 'data-src', 'data-lazy-src', 'src'].forEach((key) => addImage(node.attr(key)));
    const srcset = node.attr('srcset');
    if (srcset) srcset.split(',').forEach((entry) => addImage(entry.trim().split(/\s+/)[0]));
  });

  const seen = new Set();
  const images = candidates.map((item) => absoluteUrl(item, pageUrl)).filter((item) => {
    if (!item || seen.has(item)) return false;
    seen.add(item);
    const pathname = new URL(item).pathname;
    return !/\.svg$/i.test(pathname);
  }).slice(0, 60);

  return {
    source: 'Eye-Care Cartpe',
    sourceUrl: pageUrl,
    title,
    price,
    currency,
    description,
    images,
    extractedAt: new Date().toISOString(),
    warnings: [
      ...(!title ? ['Product title was not found in the page HTML.'] : []),
      ...(price == null ? ['Product price was not found; enter it manually if available.'] : []),
      ...(images.length === 0 ? ['No product images were discoverable in the page HTML.'] : [])
    ]
  };
}
