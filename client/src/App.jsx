import { useEffect, useMemo, useState } from 'react';
import { ArrowDownToLine, ArrowUpRight, Check, CircleAlert, Clock3, Image as ImageIcon, Link2, LoaderCircle, PackageSearch, RefreshCw, ShieldCheck, Sparkles, Trash2 } from 'lucide-react';

const API_BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
const EXAMPLE_URL = 'https://eye-care.cartpe.shop/product-detail/hong-kong-watch-m-942-npi785846929-eye-care';

export default function App() {
  const [url, setUrl] = useState('');
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [selectedImage, setSelectedImage] = useState(0);
  const [saveStatus, setSaveStatus] = useState('');
  const [showReview, setShowReview] = useState(false);
  const [reviewConfirmed, setReviewConfirmed] = useState(false);
  const [hubConnected, setHubConnected] = useState(false);
  const [hubLoading, setHubLoading] = useState(false);
  const [hubError, setHubError] = useState('');
  const [hubMeta, setHubMeta] = useState({ categories: [], brands: [], addons: [] });
  const [listing, setListing] = useState({ regularPrice: '', salePrice: '', stock: '10', categoryId: '', brandId: '', addonIds: [], isActive: true, showOnHome: true, codAvailable: true, isBestSeller: false });
  const [publishing, setPublishing] = useState(false);
  const [publishResult, setPublishResult] = useState(null);
  const [publishConfirm, setPublishConfirm] = useState(false);
  const hubBridgeRequest = (request) => new Promise((resolve, reject) => {
    const id = 'hub-' + Date.now() + '-' + Math.random().toString(36).slice(2);
    const eventName = 'AUTO_LISTING_HUB_RESPONSE_' + id;
    const timeout = window.setTimeout(() => { window.removeEventListener(eventName, handler); reject(new Error('HodaHub bridge timed out. Check that the extension is installed and HodaHub admin is open.')); }, 25000);
    const handler = (event) => { window.clearTimeout(timeout); window.removeEventListener(eventName, handler); event.detail?.ok ? resolve(event.detail.data) : reject(new Error(event.detail?.error || 'HodaHub bridge request failed.')); };
    window.addEventListener(eventName, handler, { once: true });
    window.dispatchEvent(new CustomEvent('AUTO_LISTING_HUB_REQUEST', { detail: { id, request } }));
  });
  async function connectHub() {
    setHubLoading(true); setHubError(''); setHubConnected(false);
    try {
      const catalog = await hubBridgeRequest({ action: 'catalog' });
      setHubMeta(catalog);
      setHubConnected(true);
      if (catalog.categories[0]) setListing(v => ({ ...v, categoryId: v.categoryId || catalog.categories[0].id }));
      if (catalog.brands[0]) setListing(v => ({ ...v, brandId: v.brandId || catalog.brands[0].id }));
    } catch (e) {
      setHubError(e.message + ' Extension install/reload karke HodaHub admin tab open rakho.');
    } finally { setHubLoading(false); }
  }
  async function publishProduct() {
    if (!product || publishing || publishResult) return;
    setPublishing(true); setHubError(''); setPublishConfirm(false);
    try {
      const title = product.title.trim(), description = product.description.trim();
      const price = Number(listing.regularPrice), discountPrice = Number(listing.salePrice), stock = Number(listing.stock);
      if (!title || !description || !product.images.length || !listing.categoryId || !listing.brandId || !Number.isFinite(price) || price <= 0 || !Number.isFinite(discountPrice) || discountPrice < 0 || !Number.isInteger(stock) || stock < 0) throw new Error('Title, description, images, category, brand, valid prices and stock are required.');
      if (discountPrice > price) throw new Error('Sale Price regular price se zyada nahi ho sakta.');
      const uploaded = [];
      for (const imageUrl of product.images) {
        const signature = await hubBridgeRequest({ action: 'upload-signature' });
        const imageResponse = await fetch(imageUrl);
        if (!imageResponse.ok) throw new Error('Supplier image download failed. Source image access blocked.');
        const imageBlob = await imageResponse.blob();
        const form = new FormData();
        form.append('file', imageBlob, 'product-image.jpg'); form.append('api_key', signature.apiKey);
        form.append('timestamp', String(signature.timestamp)); form.append('folder', signature.folder); form.append('signature', signature.signature);
        const cloud = await fetch('https://api.cloudinary.com/v1_1/' + signature.cloudName + '/auto/upload', { method: 'POST', body: form });
        const cloudData = await cloud.json().catch(() => ({}));
        if (!cloud.ok || !cloudData.secure_url) throw new Error(cloudData.error?.message || 'Cloudinary image upload failed.');
        uploaded.push(cloudData.secure_url);
      }
      const brand = hubMeta.brands.find(x => x.id === listing.brandId);
      const payload = {
        name: title, brand: brand?.name || brand?.title || '', brandId: listing.brandId, categoryId: listing.categoryId,
        description, price: price.toFixed(2), discountPrice: discountPrice.toFixed(2), images: uploaded,
        isActive: listing.isActive, showOnHome: listing.showOnHome, codAvailable: listing.codAvailable,
        isBestSeller: listing.isBestSeller, productLink: product.sourceUrl, stock,
        specifications: [], addonIds: listing.addonIds, addonLinks: []
      };
      const created = await hubBridgeRequest({ action: 'publish', payload });
      const saved = created.product || created.data || created;
      setPublishResult({ id: saved.id, name: saved.name || title, slug: saved.slug || '' });
      setNotice('Product successfully published to HodaHub.');
    } catch (e) { setHubError(e.message || 'Publish failed.'); }
    finally { setPublishing(false); }
  }

  const draftKey = product?.sourceUrl ? `auto-listing-draft:${product.sourceUrl}` : '';

  // Session-only drafts: survive refresh in this tab, without a database.
  useEffect(() => {
    if (!product || !draftKey) return;
    try {
      const drafts = JSON.parse(sessionStorage.getItem('auto-listing-drafts') || '{}');
      drafts[draftKey] = product;
      sessionStorage.setItem('auto-listing-drafts', JSON.stringify(drafts));
      setSaveStatus('Saved in this session');
    } catch {
      setSaveStatus('Session storage unavailable');
    }
  }, [product, draftKey]);
  const imageCount = product?.images?.length || 0;
  const priceLabel = useMemo(() => {
    if (product?.price === null || product?.price === undefined || product.price === '') return 'Not found';
    try { return new Intl.NumberFormat('en-IN', { style: 'currency', currency: product.currency || 'INR', maximumFractionDigits: 2 }).format(Number(product.price)); }
    catch { return String(product.price); }
  }, [product?.price, product?.currency]);

  async function fetchProduct(event) {
    event?.preventDefault();
    setError(''); setNotice(''); setShowReview(false); setReviewConfirmed(false);
    if (!url.trim()) { setError('Product URL paste karo, phir Fetch Product click karo.'); return; }
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/fetch-product`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: url.trim() })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Product fetch nahi ho paya.');
      const fetchedProduct = { ...data.product, title: data.product.title || '', price: data.product.price ?? '', description: data.product.description || '', images: data.product.images || [] };
      const key = `auto-listing-draft:${fetchedProduct.sourceUrl || url.trim()}`;
      let savedDraft = null;
      try { savedDraft = JSON.parse(sessionStorage.getItem('auto-listing-drafts') || '{}')[key] || null; } catch { /* continue with fetched data */ }
      setProduct(savedDraft ? { ...fetchedProduct, ...savedDraft, images: savedDraft.images || fetchedProduct.images } : fetchedProduct);
      setSelectedImage(0);
      setNotice(savedDraft ? 'Product fetched. Your session draft has been restored.' : 'Product details fetched. Review and edit the preview below.');
    } catch (err) { setError(err.message || 'Network error. Please try again.'); }
    finally { setLoading(false); }
  }

  function updateProduct(field, value) { setReviewConfirmed(false); setProduct((current) => ({ ...current, [field]: value })); }
  function removeImage(image) {
    setReviewConfirmed(false);
    setProduct((current) => ({ ...current, images: current.images.filter((item) => item !== image) }));
    setSelectedImage(0);
  }

  return <div className="app-shell">
    <header className="topbar">
      <a className="brand" href="#top" aria-label="Auto Listing home"><span className="brand-mark"><PackageSearch size={21} /></span><span><b>Auto Listing</b><small>PRODUCT IMPORT WORKSPACE</small></span></a>
      <div className="top-right"><span className="phase-pill"><span className="status-dot" /> PRODUCT WORKSPACE · PHASE 1–4</span><span className="avatar">T</span></div>
    </header>
    <main id="top" className="main-wrap">
      <section className="welcome-row">
        <div><div className="eyebrow">HODAHUB · SUPPLIER IMPORT</div><h1>Product Fetcher</h1><p className="subheading">Bring supplier product details into one clean review workspace.</p></div>
        <div className="secure-note"><ShieldCheck size={16} /><span>HodaHub session-based publishing</span></div>
      </section>
      <section className="fetch-card">
        <div className="section-heading"><div className="heading-icon"><Link2 size={19} /></div><div><h2>Source product URL</h2><p>Paste a product link from the supported supplier website.</p></div></div>
        <form onSubmit={fetchProduct} className="url-form">
          <div className="url-input-wrap"><Link2 size={18} /><input type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://eye-care.cartpe.shop/product-detail/..." aria-label="Product URL" /></div>
          <button className="primary-btn" type="submit" disabled={loading}>{loading ? <><LoaderCircle className="spin" size={17} /> Fetching...</> : <><PackageSearch size={17} /> Fetch Product</>}</button>
        </form>
        <div className="form-foot"><span><ShieldCheck size={14} /> Supported source: <b>eye-care.cartpe.shop</b></span><button className="text-btn" type="button" onClick={() => setUrl(EXAMPLE_URL)}>Use example URL <ArrowUpRight size={13} /></button></div>
        {error && <div className="alert error-alert"><CircleAlert size={17} /><span>{error}</span></div>}
        {notice && <div className="alert success-alert"><Check size={17} /><span>{notice}</span></div>}
      </section>
      {!product ? <section className="empty-state"><div className="empty-art"><PackageSearch size={34} /></div><h3>Your product preview will appear here</h3><p>Fetch a supplier product to review its title, price, description and available images.</p><div className="empty-steps"><span><b>01</b> Paste URL</span><i /><span><b>02</b> Fetch details</span><i /><span><b>03</b> Review & edit</span></div></section> : <>
        <div className="preview-title-row"><div><div className="eyebrow">FETCH RESULT</div><h2>Product preview</h2></div><span className="fetched-time"><Clock3 size={14} /> Fetched {new Date(product.extractedAt).toLocaleString('en-IN')}</span></div>
        {product.warnings?.length > 0 && <div className="warning-list">{product.warnings.map((warning) => <div key={warning}><CircleAlert size={15} />{warning}</div>)}</div>}
        <div className="preview-grid">
          <section className="panel gallery-panel">
            <div className="panel-head"><div><h3>Product images</h3><p>Available images discovered on the source page</p></div><span className="count-chip"><ImageIcon size={14} /> {imageCount} images</span></div>
            {imageCount ? <><div className="main-image-wrap"><img src={product.images[Math.min(selectedImage, imageCount - 1)]} alt={product.title || 'Supplier product'} onError={(e) => { e.currentTarget.dataset.failed = 'true'; }} /><span className="image-index">{Math.min(selectedImage + 1, imageCount)} / {imageCount}</span></div><div className="thumb-grid">{product.images.map((image, index) => <div className={`thumb ${selectedImage === index ? 'active' : ''}`} key={image}><button type="button" onClick={() => setSelectedImage(index)} aria-label={`View image ${index + 1}`}><img src={image} alt={`Product view ${index + 1}`} loading="lazy" /></button><button type="button" className="remove-image" onClick={() => removeImage(image)} aria-label="Remove image"><Trash2 size={13} /></button></div>)}</div></> : <div className="no-images"><ImageIcon size={26} /><span>No images found on the page</span></div>}
            <div className="gallery-foot"><span><ShieldCheck size={14} /> Images are previewed from their source URLs</span><span>Temporary preview only</span></div>
          </section>
          <section className="panel details-panel">
            <div className="panel-head"><div><h3>Product details</h3><p>Editable source information</p></div><span className="edit-chip">EDITABLE</span></div>
            <label className="field-label">PRODUCT TITLE<input value={product.title} onChange={(e) => updateProduct('title', e.target.value)} placeholder="Product title" /></label>
            <div className="field-row"><label className="field-label">PRICE ({product.currency || 'INR'})<input type="number" min="0" step="0.01" value={product.price} onChange={(e) => updateProduct('price', e.target.value)} placeholder="Enter price" /></label><div className="price-preview"><small>FORMATTED PRICE</small><b>{priceLabel}</b></div></div>
            <label className="field-label">DESCRIPTION<textarea rows="7" value={product.description} onChange={(e) => updateProduct('description', e.target.value)} placeholder="No description found. You can enter it manually." /></label>
            <div className="source-box"><span className="source-icon"><ArrowDownToLine size={16} /></span><div><b>Source website</b><a href={product.sourceUrl} target="_blank" rel="noreferrer">{product.source} <ArrowUpRight size={12} /></a></div></div>
            <div className="review-actions"><button className="secondary-btn" onClick={() => { setProduct(null); setNotice(''); setError(''); }} type="button"><RefreshCw size={15} /> Clear preview</button><span><Check size={14} /> {saveStatus || 'Session draft'}</span></div>
          </section>
        </div>

        <section className="panel publish-panel">
          <div className="panel-head"><div><h3>HodaHub publishing</h3><p>Install the Auto Listing Chrome extension and keep your HodaHub admin tab logged in.</p></div><span className={hubConnected ? 'edit-chip' : 'count-chip'}>{hubConnected ? 'CONNECTED' : 'NOT CONNECTED'}</span></div>
          <button className="secondary-btn" type="button" onClick={connectHub} disabled={hubLoading}>{hubLoading ? 'Connecting…' : 'Connect HodaHub via Chrome extension'}</button>
          {hubError && <div className="alert error-alert"><CircleAlert size={16}/><span>{hubError}</span></div>}
          {hubConnected && <>
            <div className="publish-fields">
              <label className="field-label">REGULAR PRICE (₹)<input type="number" min="0.01" step="0.01" value={listing.regularPrice} onChange={e=>setListing(v=>({...v,regularPrice:e.target.value}))} placeholder="Enter regular price"/></label>
              <label className="field-label">SALE PRICE (₹)<input type="number" min="0" step="0.01" value={listing.salePrice} onChange={e=>setListing(v=>({...v,salePrice:e.target.value}))} placeholder="Enter sale price"/></label>
              <label className="field-label">STOCK QUANTITY<input type="number" min="0" step="1" value={listing.stock} onChange={e=>setListing(v=>({...v,stock:e.target.value}))}/></label>
              <label className="field-label">CATEGORY<select value={listing.categoryId} onChange={e=>setListing(v=>({...v,categoryId:e.target.value}))}><option value="">Select category</option>{hubMeta.categories.map(x=><option key={x.id} value={x.id}>{x.name || x.title}</option>)}</select></label>
              <label className="field-label">BRAND<select value={listing.brandId} onChange={e=>setListing(v=>({...v,brandId:e.target.value}))}><option value="">Select brand</option>{hubMeta.brands.map(x=><option key={x.id} value={x.id}>{x.name || x.title}</option>)}</select></label>
              <label className="field-label">ADD-ONS (MULTI SELECT)<select multiple value={listing.addonIds} onChange={e=>setListing(v=>({...v,addonIds:[...e.target.selectedOptions].map(o=>o.value)}))}>{hubMeta.addons.map(x=><option key={x.id} value={x.id}>{x.name || x.title} {x.price != null ? `— ₹${x.price}` : ''}</option>)}</select></label>
            </div>
            <div className="publish-toggles">{[['isActive','Active'],['showOnHome','Show on Home Page'],['codAvailable','Cash on Delivery'],['isBestSeller','Best Seller']].map(([key,label])=><label key={key}><input type="checkbox" checked={listing[key]} onChange={e=>setListing(v=>({...v,[key]:e.target.checked}))}/>{label}</label>)}</div>
            {publishResult ? <div className="alert success-alert"><Check size={17}/><span>Published: {publishResult.name} · ID: {publishResult.id || 'Created'}</span></div> : <button className="primary-btn" type="button" disabled={!hubConnected || publishing} onClick={()=>setPublishConfirm(true)}>{publishing ? 'Publishing…' : 'Publish product to HodaHub'}</button>}
          </>}
        </section>
        {publishConfirm && <div className="modal-backdrop"><section className="confirm-modal" role="dialog" aria-modal="true"><div className="modal-icon"><ShieldCheck size={22}/></div><h3>Publish product?</h3><p>This uploads the selected supplier images to HodaHub Cloudinary and creates a product using the values above. Review all fields before continuing.</p><div className="modal-actions"><button className="secondary-btn" onClick={()=>setPublishConfirm(false)}>Cancel</button><button className="primary-btn" onClick={publishProduct}>Confirm & publish</button></div></section></div>}
        <section className="review-panel">
          <div className="review-panel-copy"><div className="eyebrow">FINAL CHECK</div><h3>Review before publishing</h3><p>Confirm that the prepared title, price, description and selected images are exactly as you want them.</p><div className="validation-list">
            {[
              ['Product title', Boolean(product.title?.trim())],
              ['Price', product.price !== '' && product.price !== null && Number.isFinite(Number(product.price)) && Number(product.price) >= 0],
              ['Description', Boolean(product.description?.trim())],
              ['At least one product image', Array.isArray(product.images) && product.images.length > 0]
            ].map(([label, valid]) => <div className={valid ? 'validation-ok' : 'validation-missing'} key={label}>{valid ? <Check size={14} /> : <CircleAlert size={14} />}{label}: {valid ? 'Ready' : 'Missing / check required'}</div>)}
          </div></div>
          <div className="review-panel-actions"><span className={reviewConfirmed ? 'confirmed-state' : 'pending-state'}>{reviewConfirmed ? 'Details confirmed' : 'Not confirmed yet'}</span><button className="primary-btn" type="button" onClick={() => setShowReview(true)}>Review final details <ShieldCheck size={16} /></button></div>
        </section>
        {showReview && <div className="modal-backdrop" role="presentation"><section className="confirm-modal" role="dialog" aria-modal="true" aria-labelledby="confirm-title"><div className="modal-icon"><ShieldCheck size={22} /></div><h3 id="confirm-title">Confirm product details</h3><p>Check the prepared product before publishing. Publishing will create a live HodaHub product after your final approval.</p><div className="confirm-summary"><span>Title <b>{product.title || 'Missing'}</b></span><span>Price <b>{priceLabel}</b></span><span>Description <b>{product.description?.trim() ? `${product.description.trim().length} characters` : 'Missing'}</b></span><span>Images <b>{imageCount}</b></span></div><div className="modal-actions"><button className="secondary-btn" type="button" onClick={() => setShowReview(false)}>Back to edit</button><button className="primary-btn" type="button" onClick={() => { setReviewConfirmed(true); setShowReview(false); }}>Confirm details</button></div></section></div>}
      </>}
      <section className="phase-note"><div className="sparkle"><Sparkles size={17} /></div><div><b>Phase 1–3 · Fetch, edit & review</b><p>Supplier fetching remains unchanged. Manual descriptions are saved in this browser tab session, and final product details can be reviewed and confirmed. Phase 4 connects through the Chrome extension to your existing HodaHub admin session.</p></div></section>
    </main>
    <footer><span>Auto Listing Software</span><span>Built for HodaHub · Phase 1</span></footer>
  </div>;
}
