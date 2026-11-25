chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type !== 'AUTO_LISTING_HUB_REQUEST') return;
  (async () => {
    const tabs = await chrome.tabs.query({ url: ['https://www.hodahub.in/*', 'https://hodahub.in/*'] });
    const tab = tabs.find(t => t.url && /\/admin(?:\/|$)/.test(new URL(t.url).pathname));
    if (!tab?.id) throw new Error('HodaHub admin tab nahi mila. Pehle isi Chrome profile mein https://www.hodahub.in/admin open karke login karo.');
    try {
      return await chrome.tabs.sendMessage(tab.id, { type: 'AUTO_LISTING_HUB_EXECUTE', request: message.request });
    } catch {
      await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['hodahub-content.js'] });
      return await chrome.tabs.sendMessage(tab.id, { type: 'AUTO_LISTING_HUB_EXECUTE', request: message.request });
    }
  })().then(data => sendResponse({ ok: true, data })).catch(error => sendResponse({ ok: false, error: error.message }));
  return true;
});