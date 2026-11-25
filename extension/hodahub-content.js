(() => {
  if (window.__autoListingHubBridgeInstalled) return;
  window.__autoListingHubBridgeInstalled = true;
  const json = async (path, options = {}) => {
    const response = await fetch(path, { credentials: 'include', ...options, headers: { Accept: 'application/json', ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }), ...(options.headers || {}) } });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || data.error || 'HodaHub API error: ' + response.status);
    return data;
  };
  const list = (value, keys) => { for (const key of keys) if (Array.isArray(value?.[key])) return value[key]; return Array.isArray(value) ? value : []; };
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message?.type !== 'AUTO_LISTING_HUB_EXECUTE') return;
    (async () => {
      const req = message.request || {};
      if (req.action === 'catalog') {
        const [categories, brands, addons] = await Promise.all([
          json('/api/admin/categories'), json('/api/admin/brands'), json('/api/admin/addons')
        ]);
        return { categories: list(categories, ['categories','data']), brands: list(brands, ['brands','data']), addons: list(addons, ['addons','data']).filter(x => x.isActive !== false) };
      }
      if (req.action === 'upload-signature') return json('/api/upload/signature', { method: 'POST', body: JSON.stringify({ uploadType: 'product-image' }) });
      if (req.action === 'publish') return json('/api/admin/products', { method: 'POST', body: JSON.stringify(req.payload) });
      throw new Error('Unsupported bridge action.');
    })().then(data => sendResponse({ ok: true, data })).catch(error => sendResponse({ ok: false, error: error.message }));
    return true;
  });
})();