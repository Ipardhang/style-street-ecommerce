# Style Street

A full-stack fashion e-commerce application with authentication, product browsing, cart and checkout flows, inventory management, and a MongoDB-backed catalogue.

## Tech stack

- Node.js + Express
- MongoDB + Mongoose
- JWT authentication + bcrypt
- HTML, CSS, vanilla JavaScript

## Features

- User registration and login
- Product catalogue and search
- Cart and checkout workflow
- Inventory-aware ordering
- Admin bootstrap flow
- Server-side price and stock validation
- MongoDB transaction support for checkout
- Rate limiting on authentication endpoints
- Optional third-party fashion catalogue integration

## Run locally

```bash
npm install
cp .env.example .env
npm run seed
npm start
```

Configure `MONGO_URI`, a random 32+ character `JWT_SECRET`, and secure admin credentials in `.env`.

For production-style checkout testing, use MongoDB Atlas or another replica-set deployment.

## Security

Never commit `.env`, API keys, admin credentials, or provider secrets. Checkout validates prices and stock on the server instead of trusting client-side totals.

> Demo checkout only: it does not charge real payments or reserve third-party inventory.
