# Style Street - Full-Stack E-Commerce App

**Stack:** Node.js, Express, MongoDB (Mongoose), JWT auth, bcrypt, vanilla JS frontend.

## Setup

1. Install Node.js 18+ and MongoDB (local replica set or MongoDB Atlas).
2. Run `npm install`.
3. Copy `.env.example` to `.env`.
4. Set `MONGO_URI` and a random `JWT_SECRET` of at least 32 characters.
5. For admin bootstrap, set `ADMIN_EMAIL` and `ADMIN_PASSWORD` (at least 12 characters). The seed script never hard-codes production credentials.
6. For the optional live Myntra catalogue, set `MYNTRA_API_KEY`. This project uses ReefAPI, a third-party provider; it is not affiliated with Myntra.
7. Run `npm run seed` once, then `npm start`.

## Security and production notes

- Checkout uses a MongoDB transaction so inventory decrements and order creation commit or roll back together. Use MongoDB Atlas or a replica-set deployment; standalone MongoDB does not support multi-document transactions.
- Login and registration are rate-limited in-process. For a multi-instance deployment, move rate limiting to Redis or an equivalent shared store.
- Do not commit `.env`, API keys, or admin credentials.
- Production responses avoid returning raw server errors.
- Product and order queries are bounded to prevent unbounded responses.
- Prices and stock are re-read server-side at checkout; client-side cart data is never trusted for payment totals.
- The checkout is a demo and does not charge real payments or reserve third-party inventory.

## Myntra catalogue

The catalogue refresh runs at most once every 15 minutes per server process and uses six grouped searches, with an 8-second provider timeout. Results are cached in MongoDB. Search on the site filters the cached catalogue; it does not create a provider request per keystroke.

Review the provider's current terms, pricing, and data rights before commercial use.
