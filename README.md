# Auto Listing Software

Separate product-import workspace for HodaHub. Phase 1 is product fetching and review only; no AI generation, HodaHub publishing, or permanent image storage.

## Phase 1
- Product URL input for the initial supplier: `eye-care.cartpe.shop`
- Extract title, available price, description, and discoverable product images from HTML metadata, JSON-LD, and gallery markup.
- Editable title, price, and description preview; remove unwanted images.
- Clear validation and extraction errors.
- Product preview stays in browser memory only.

## Run locally
Node.js 20+
```bash
npm install
npm run dev
```
Frontend: http://localhost:5173 · API: http://localhost:4000

Copy `server/.env.example` to `server/.env` when changing configuration.

## Deployment
- Vercel: set root directory to `client`; set `VITE_API_BASE_URL` to the deployed API URL.
- Render (or another Node host): root directory `server`, build command `npm install`, start command `npm start`; set `CLIENT_ORIGIN` to the frontend origin.

## Limitations
Only Eye-Care Cartpe is supported in this phase. Extraction is based on server-rendered HTML, metadata, JSON-LD, and image markup. If the supplier renders data only in browser-side JavaScript, some fields/images may not be discoverable. Some CDNs may block image previews. Test the actual supplier URL after deploying the API before calling Phase 1 production-ready.

## Security
The API only fetches the configured supplier host, rejects credentials and unexpected ports, does not follow redirects, applies a timeout and a 4 MB response cap, and does not accept arbitrary fetch URLs. Add future suppliers through explicit adapters.
