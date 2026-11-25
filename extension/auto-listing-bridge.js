(() => {
  if (window.__autoListingBridgeInstalled) return;
  window.__autoListingBridgeInstalled = true;
  window.addEventListener('AUTO_LISTING_HUB_RESPONSE', event => {
    window.dispatchEvent(new CustomEvent('AUTO_LISTING_HUB_RESPONSE_' + event.detail.id, { detail: event.detail }));
  });
  window.addEventListener('AUTO_LISTING_HUB_REQUEST', event => {
    const { id, request } = event.detail || {};
    chrome.runtime.sendMessage({ type: 'AUTO_LISTING_HUB_REQUEST', request }, response => {
      const result = chrome.runtime.lastError ? { ok: false, error: chrome.runtime.lastError.message } : response;
      window.dispatchEvent(new CustomEvent('AUTO_LISTING_HUB_RESPONSE_' + id, { detail: result }));
    });
  });
})();