# Style Street – Full-Stack E-Commerce App

**Stack:** Node.js, Express, MongoDB (Mongoose), JWT auth, bcrypt, vanilla JS frontend.

## Myntra product catalogue setup

The shop automatically refreshes products when the page opens (and reuses a 15-minute in-memory refresh window to avoid unnecessary API calls). It fetches product names, brands, images, current listed prices, MRP/discounts, categories and short descriptions from a third-party Myntra catalogue API, then caches results in MongoDB.

**Important:** Myntra's official Developer Centre is designed for approved sellers/marketplace partners and is not a general public shopping catalogue API. This project therefore includes an adapter for ReefAPI, a third-party data provider. It is not an official Myntra API. Before using it in a public/commercial store, review the provider's current terms, data rights, pricing and permitted use. No website scraping is implemented.

1. Install Node.js 18+ and MongoDB (local or MongoDB Atlas).
2. Run `npm install`.
3. Copy `.env.example` to `.env`.
4. Set `MONGO_URI` and a strong `JWT_SECRET`.
5. Create a ReefAPI account at https://reefapi.com/myntra-api and place its key in `MYNTRA_API_KEY` in `.env`. Do not expose the key in frontend JavaScript or commit `.env` to Git.
6. Run `npm start` and open http://localhost:3000.

The provider key is required to fetch live Myntra catalogue data. Without it, the site shows a clear setup warning and does not silently label sample products as Myntra products. If the provider is temporarily unavailable, the last saved Myntra products remain available from MongoDB.

## Refresh behaviour

On first catalogue request after server startup, the backend searches six catalogue groups (men clothing, women clothing, shoes, bags, watches/jewellery/sunglasses, and beauty/skincare) and saves returned products. Refreshes are throttled to once every 15 minutes per running server process. A browser search filters the saved catalogue without making a new provider call. The current setup can make up to six provider requests per refresh; see the provider's current pricing before enabling it.

## Run

```bash
npm install
cp .env.example .env
# edit .env, then:
npm start
```

## Existing app features

- Product search, category filtering, sorting and product photo galleries
- Cart, wishlist, login/register, orders and admin product management
- MongoDB-backed product cache
- Myntra product cards link to the source product page when a source URL is supplied

## Notes

Prices and stock can change at the source. This demo checkout is not connected to Myntra, does not reserve Myntra inventory and does not process real payments. Do not imply that Style Street is affiliated with Myntra.
