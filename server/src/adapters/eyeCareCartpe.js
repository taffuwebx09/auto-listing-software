import { webcrypto } from 'node:crypto';

const clean = (value) => typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';
const IMAGE_BASE = 'https://cdn.cartpe.shop/images/gallery_lg/';

function getAesKey(sourceKey) {
  if (typeof sourceKey !== 'string' || !sourceKey) {
    throw new Error('Eye-Care Cartpe API key is not configured on the server.');
  }

  let keyHex = sourceKey.slice(3);
  keyHex = keyHex.slice(0, -3);
  keyHex = keyHex.slice(0, 32) + keyHex.slice(36);

  if (!/^[\da-f]{64}$/i.test(keyHex)) {
    throw new Error('Eye-Care Cartpe API key has an unexpected format.');
  }

  return Uint8Array.from(keyHex.match(/.{2}/g), (pair) => Number.parseInt(pair, 16));
}

const toBase64 = (bytes) => Buffer.from(bytes).toString('base64');
const fromBase64 = (value) => new Uint8Array(Buffer.from(value, 'base64'));

async function encryptPayload(value, key) {
  const iv = webcrypto.getRandomValues(new Uint8Array(12));
  const cryptoKey = await webcrypto.subtle.importKey('raw', key, 'AES-GCM', false, ['encrypt']);
  const encrypted = await webcrypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    cryptoKey,
    new TextEncoder().encode(JSON.stringify(value))
  );
  return { iv: toBase64(iv), payload: toBase64(new Uint8Array(encrypted)) };
}

async function decryptPayload(envelope, key) {
  if (!envelope?.iv || !envelope?.payload) {
    throw new Error('Eye-Care Cartpe returned an invalid encrypted response.');
  }
  const cryptoKey = await webcrypto.subtle.importKey('raw', key, 'AES-GCM', false, ['decrypt']);
  const decrypted = await webcrypto.subtle.decrypt(
    { name: 'AES-GCM', iv: fromBase64(envelope.iv) },
    cryptoKey,
    fromBase64(envelope.payload)
  );
  return JSON.parse(new TextDecoder().decode(decrypted));
}

function getImageUrl(filename) {
  if (typeof filename !== 'string') return null;
  const safeName = filename.trim();
  if (!safeName || safeName.includes('/') || safeName.includes('\\') || safeName.includes('..')) return null;
  return new URL(encodeURIComponent(safeName), IMAGE_BASE).href;
}

export async function fetchEyeCareProduct(productUrl) {
  const url = new URL(productUrl);
  const match = url.pathname.match(/^\/product-detail\/([^/]+)\/?$/);
  if (!match) throw new Error('Please enter a valid Eye-Care Cartpe product detail URL.');

  const slug = decodeURIComponent(match[1]);
  const key = getAesKey(process.env.EYECARE_CARTPE_FRONTEND_KEY);
  const requestBody = await encryptPayload({ slug }, key);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch('https://eye-care.cartpe.shop/api/product-details', {
      method: 'POST',
      signal: controller.signal,
      redirect: 'manual',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'X-Tenant-Host': 'eye-care.cartpe.shop',
        'User-Agent': 'AutoListingProductPreview/1.0'
      },
      body: JSON.stringify(requestBody)
    });

    if ([301, 302, 303, 307, 308].includes(response.status)) {
      throw new Error('Eye-Care Cartpe redirected the product API request.');
    }
    if (!response.ok) throw new Error(`Eye-Care Cartpe product API returned HTTP ${response.status}.`);

    const envelope = await response.json();
    const result = await decryptPayload(envelope, key);
    if (result?.status !== true || !result?.data || typeof result.data !== 'object') {
      throw new Error(result?.message || 'Eye-Care Cartpe did not return product details for this link.');
    }

    const item = result.data;
    const imageNames = [
      item.image,
      ...(Array.isArray(item.gallery) ? item.gallery.map((entry) => entry?.image) : [])
    ];
    const seen = new Set();
    const images = imageNames.map(getImageUrl).filter((image) => {
      if (!image || seen.has(image)) return false;
      seen.add(image);
      return true;
    }).slice(0, 60);

    const title = clean(item.productName);
    const price = Number(item.basicPrice);
    const validPrice = Number.isFinite(price) && price >= 0 ? price : null;
    const description = clean(item.description);

    return {
      source: 'Eye-Care Cartpe',
      sourceUrl: productUrl,
      title,
      price: validPrice,
      originalPrice: Number.isFinite(Number(item.oldPrice)) ? Number(item.oldPrice) : null,
      currency: 'INR',
      description,
      images,
      extractedAt: new Date().toISOString(),
      warnings: [
        ...(!title ? ['Product title was not returned by the supplier API.'] : []),
        ...(validPrice == null ? ['Product price was not returned; enter it manually if available.'] : []),
        ...(images.length === 0 ? ['No product images were returned by the supplier API.'] : [])
      ]
    };
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('Eye-Care Cartpe took too long to respond. Please try again.');
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}
