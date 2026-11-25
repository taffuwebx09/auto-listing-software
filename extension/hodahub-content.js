(() => {
  if (globalThis.__autoListingHubBridgeInstalled) return;
  globalThis.__autoListingHubBridgeInstalled = true;
  const readJson = async (path, options={}) => {
    const response = await fetch(path,{credentials:"include",...options,headers:{Accept:"application/json",...(options.body instanceof FormData?{}:{"Content-Type":"application/json"}),...(options.headers||{})}});
    const data = await response.json().catch(()=>({}));
    if (!response.ok) throw new Error(data.message || data.error || `HodaHub API returned ${response.status}`);
    return data;
  };
  const arrayFrom = (value,keys) => { for (const key of keys) if (Array.isArray(value?.[key])) return value[key]; return Array.isArray(value)?value:[]; };
  chrome.runtime.onMessage.addListener((message,sender,sendResponse) => {
    if (message?.type !== "AUTO_LISTING_HUB_EXECUTE") return;
    (async()=>{
      const request=message.request||{};
      if (request.action==="ping") return {authenticatedPage:location.pathname.startsWith("/admin"),page:location.pathname};
      if (request.action==="catalog") {
        const [categories,brands,addons]=await Promise.all([readJson("/api/admin/categories"),readJson("/api/admin/brands"),readJson("/api/admin/addons")]);
        return {categories:arrayFrom(categories,["categories","data"]),brands:arrayFrom(brands,["brands","data"]),addons:arrayFrom(addons,["addons","data"]).filter(x=>x.isActive!==false)};
      }
      if (request.action==="upload-signature") return readJson("/api/upload/signature",{method:"POST",body:JSON.stringify({uploadType:"product-image"})});
      if (request.action==="publish") return readJson("/api/admin/products",{method:"POST",body:JSON.stringify(request.payload)});
      throw new Error("Unsupported bridge action.");
    })().then(data=>sendResponse({ok:true,data})).catch(error=>sendResponse({ok:false,error:error?.message||String(error)}));
    return true;
  });
})();