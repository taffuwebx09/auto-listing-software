# Auto Listing — HodaHub Chrome Bridge

This extension connects the Auto Listing web app to an already authenticated HodaHub Admin tab in the same Chrome profile. It does not collect, display, store, or transmit passwords, OTPs, or cookie values.

## Install (developer/unpacked)

1. Download this repository and extract it.
2. Open `chrome://extensions` in Chrome.
3. Turn on **Developer mode**.
4. Click **Load unpacked** and select the repository's `extension` folder.
5. Keep the extension enabled.
6. In the same Chrome profile, open `https://www.hodahub.in/admin` and sign in normally.
7. Open `https://auto-listing-software-4sdi.vercel.app/` and click **Connect HodaHub via Chrome extension**.

## What it does

- Reads the HodaHub Categories, Brands and Add-ons endpoints from the logged-in admin tab.
- Requests a product-image upload signature from HodaHub.
- Sends product creation requests from the authenticated HodaHub tab.
- Uses the existing HodaHub browser session; no credentials are copied into Auto Listing.

## Notes

- Keep a HodaHub Admin tab open in the same Chrome profile while connecting and publishing.
- This is an unpacked developer build, not a Chrome Web Store package.
- HodaHub endpoint response shapes and permissions may change. Test catalog loading before attempting a product publish.
- Image retrieval from the supplier CDN and Cloudinary upload must succeed for every selected image before product creation.
- A successful GitHub push does not itself prove a successful live HodaHub publish.
