(() => {
  if (globalThis.__autoListingBridgeInstalled) return;
  globalThis.__autoListingBridgeInstalled = true;

  const respond = (id, result) => {
    window.dispatchEvent(new CustomEvent('AUTO_LISTING_HUB_RESPONSE_' + id, { detail: result }));
  };

  window.addEventListener('AUTO_LISTING_HUB_REQUEST', event => {
    const { id, request } = event.detail || {};
    if (!id) return;

    // This file must run as an extension content script (ISOLATED world),
    // where the Chrome extension runtime API is available.
    if (typeof chrome === 'undefined' || !chrome.runtime || !chrome.runtime.sendMessage) {
      respond(id, { ok: false, error: 'Extension bridge context missing. Chrome extension reload karke Auto Listing tab refresh karo.' });
      return;
    }

    try {
      chrome.runtime.sendMessage(
        { type: 'AUTO_LISTING_HUB_REQUEST', request },
        response => {
          const lastError = chrome.runtime.lastError;
          if (lastError) {
            respond(id, { ok: false, error: lastError.message });
            return;
          }
          respond(id, response || { ok: false, error: 'Extension background se empty response mila.' });
        }
      );
    } catch (error) {
      respond(id, { ok: false, error: error?.message || 'Extension message failed.' });
    }
  });
})();