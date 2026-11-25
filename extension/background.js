chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type !== 'AUTO_LISTING_HUB_REQUEST') return;

  (async () => {
    const tabs = await chrome.tabs.query({
      url: ['https://www.hodahub.in/*', 'https://hodahub.in/*']
    });

    const adminTab = tabs.find(tab => {
      if (!tab.url) return false;
      try {
        return /\/admin(?:\/|$)/.test(new URL(tab.url).pathname);
      } catch {
        return false;
      }
    });

    if (!adminTab?.id) {
      throw new Error('HodaHub admin tab nahi mila. Same Chrome profile mein https://www.hodahub.in/admin open karke login karo.');
    }

    try {
      return await chrome.tabs.sendMessage(adminTab.id, {
        type: 'AUTO_LISTING_HUB_EXECUTE',
        request: message.request
      });
    } catch {
      await chrome.scripting.executeScript({
        target: { tabId: adminTab.id },
        files: ['hodahub-content.js']
      });
      return await chrome.tabs.sendMessage(adminTab.id, {
        type: 'AUTO_LISTING_HUB_EXECUTE',
        request: message.request
      });
    }
  })()
    .then(data => sendResponse({ ok: true, data }))
    .catch(error => sendResponse({ ok: false, error: error?.message || 'Unknown extension error.' }));

  return true;
});