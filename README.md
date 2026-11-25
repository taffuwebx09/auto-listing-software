# Auto Listing Software

Separate product-import workspace for HodaHub. Phase 1 is product fetching and review only; no AI generation, HodaHub publishing, or permanent image storage.

## Phase 1
- Product URL input for the initial supplier: `eye-care.cartpe.shop`
- Fetch product data from the supplier's encrypted `/api/product-details` endpoint.
- Decrypt the supplier response server-side and map product title, basic price, description, and gallery images.
- Resolve gallery filenames through the verified Cartpe gallery CDN path.
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

Copy `server/.env.example` to `server/.env`, then set `EYECARE_CARTPE_FRONTEND_KEY` to the supplier frontend key used by its public product API bundle. Keep this setting on the server only; never add it to a `VITE_*` variable or commit a real value.

## Deployment
- Vercel: set root directory to `client`; set `VITE_API_BASE_URL` to the deployed API URL.
- Render (or another Node host): root directory `server`, build command `npm install`, start command `npm start`; set `CLIENT_ORIGIN` to the frontend origin and configure `EYECARE_CARTPE_FRONTEND_KEY` as a server environment variable.

## Limitations
Only Eye-Care Cartpe is supported in this phase. The adapter depends on the supplier's current encrypted API contract and CDN image path; supplier-side changes may require an adapter update. Test the actual supplier URL after deploying the API before calling Phase 1 production-ready.

## Security
The API only accepts product URLs from the configured supplier host, rejects credentials and unexpected ports, uses a request timeout, and does not accept arbitrary fetch URLs. Supplier encryption and decryption happen server-side. Add future suppliers through explicit adapters.
