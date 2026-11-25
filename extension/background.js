chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type !== "AUTO_LISTING_HUB_REQUEST") return;
  (async () => {
    const tabs = await chrome.tabs.query({url:["https://hodahub.in/*","https://www.hodahub.in/*"]});
    const adminTab = tabs.find(tab => {
      try { return tab.url && new URL(tab.url).pathname.startsWith("/admin"); }
      catch { return false; }
    });
    if (!adminTab?.id) throw new Error("HodaHub admin tab nahi mila. HodaHub mein login karke /admin dashboard open rakho.");
    await chrome.scripting.executeScript({target:{tabId:adminTab.id},files:["hodahub-content.js"]});
    const result = await chrome.tabs.sendMessage(adminTab.id,{type:"AUTO_LISTING_HUB_EXECUTE",request:message.request});
    if (!result) throw new Error("HodaHub tab se empty response mila.");
    if (result.ok === false) throw new Error(result.error || "HodaHub request failed.");
    return result.data;
  })().then(data=>sendResponse({ok:true,data}))
    .catch(error=>sendResponse({ok:false,error:error?.message || String(error)}));
  return true;
});