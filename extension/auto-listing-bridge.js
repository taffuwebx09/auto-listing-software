(() => {
  if (globalThis.__autoListingBridgeInstalled) return;
  globalThis.__autoListingBridgeInstalled = true;
  window.addEventListener("AUTO_LISTING_HUB_REQUEST", event => {
    const detail=event.detail||{}, id=detail.id;
    if (!id) return;
    const respond=result=>window.dispatchEvent(new CustomEvent("AUTO_LISTING_HUB_RESPONSE_"+id,{detail:result}));
    if (!chrome?.runtime?.sendMessage) {
      respond({ok:false,error:"Chrome extension runtime unavailable. Extension reload karke Auto Listing tab refresh karo."});
      return;
    }
    chrome.runtime.sendMessage({type:"AUTO_LISTING_HUB_REQUEST",request:detail.request},response=>{
      const runtimeError=chrome.runtime.lastError;
      respond(runtimeError?{ok:false,error:runtimeError.message}:(response||{ok:false,error:"Extension background se response nahi mila."}));
    });
  });
})();