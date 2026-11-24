import { useMemo, useState } from 'react';
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
  const imageCount = product?.images?.length || 0;
  const priceLabel = useMemo(() => {
    if (product?.price === null || product?.price === undefined || product.price === '') return 'Not found';
    try { return new Intl.NumberFormat('en-IN', { style: 'currency', currency: product.currency || 'INR', maximumFractionDigits: 2 }).format(Number(product.price)); }
    catch { return String(product.price); }
  }, [product?.price, product?.currency]);

  async function fetchProduct(event) {
    event?.preventDefault();
    setError(''); setNotice(''); setProduct(null); setSelectedImage(0);
    if (!url.trim()) { setError('Product URL paste karo, phir Fetch Product click karo.'); return; }
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/fetch-product`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: url.trim() })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Product fetch nahi ho paya.');
      setProduct({ ...data.product, title: data.product.title || '', price: data.product.price ?? '', description: data.product.description || '', images: data.product.images || [] });
      setNotice('Product details fetched. Review and edit the preview below.');
    } catch (err) { setError(err.message || 'Network error. Please try again.'); }
    finally { setLoading(false); }
  }

  function updateProduct(field, value) { setProduct((current) => ({ ...current, [field]: value })); }
  function removeImage(image) {
    setProduct((current) => ({ ...current, images: current.images.filter((item) => item !== image) }));
    setSelectedImage(0);
  }

  return <div className="app-shell">
    <header className="topbar">
      <a className="brand" href="#top" aria-label="Auto Listing home"><span className="brand-mark"><PackageSearch size={21} /></span><span><b>Auto Listing</b><small>PRODUCT IMPORT WORKSPACE</small></span></a>
      <div className="top-right"><span className="phase-pill"><span className="status-dot" /> PHASE 01 · PRODUCT FETCHING</span><span className="avatar">T</span></div>
    </header>
    <main id="top" className="main-wrap">
      <section className="welcome-row">
        <div><div className="eyebrow">HODAHUB · SUPPLIER IMPORT</div><h1>Product Fetcher</h1><p className="subheading">Bring supplier product details into one clean review workspace.</p></div>
        <div className="secure-note"><ShieldCheck size={16} /><span>Preview only · Nothing gets published</span></div>
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
            <div className="review-actions"><button className="secondary-btn" onClick={() => { setProduct(null); setNotice(''); setError(''); }} type="button"><RefreshCw size={15} /> Clear preview</button><span><Check size={14} /> Changes stay in this preview only</span></div>
          </section>
        </div>
      </>}
      <section className="phase-note"><div className="sparkle"><Sparkles size={17} /></div><div><b>Phase 1 · Product fetching</b><p>AI description generation, HodaHub publishing and permanent image upload are intentionally not enabled yet. First, verify this supplier fetch workflow.</p></div></section>
    </main>
    <footer><span>Auto Listing Software</span><span>Built for HodaHub · Phase 1</span></footer>
  </div>;
}
