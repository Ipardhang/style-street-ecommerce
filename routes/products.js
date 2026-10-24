const router = require('express').Router();
const { Product } = require('../models');
const { auth, admin, wrap } = require('../authMiddleware');
const escapeRegex = (value = '') => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const CATALOG_TTL_MS = 15 * 60 * 1000;
let lastRefreshAt = 0;
let refreshInFlight = null;

const pick = ({ name, description, price, stock, category, gender, image, images, brand, mrp, discountPercent, sourceUrl, sourceName }) => ({
  name, description, price, stock, category, gender, image,
  images: Array.isArray(images) ? images : (image ? [image] : []),
  brand, mrp, discountPercent, sourceUrl, sourceName
});

router.get('/', wrap(async (req, res) => {
  const q = {};
  if (req.query.search) q.name = new RegExp(escapeRegex(req.query.search), 'i');
  if (req.query.category) q.category = req.query.category;
  res.json(await Product.find(q).sort('-createdAt'));
}));

function toMyntraProduct(item, searchCategory) {
  const id = String(item.product_id || item.id || '').trim();
  if (!id) return null;
  const images = [...new Set([item.image, ...(Array.isArray(item.images) ? item.images : [])]
    .filter((url) => typeof url === 'string' && /^https:\/\//i.test(url)))];
  const price = Number(item.price);
  if (!Number.isFinite(price) || price < 0) return null;
  const sku = item.featured_sku || {};
  const stockValue = Number(sku.stock);
  return {
    externalId: `myntra-reefapi-${id}`,
    name: String(item.title || item.name || 'Myntra product').trim(),
    description: String(item.short_description || item.description || `${item.brand || ''} ${item.category || searchCategory}`.trim()),
    price,
    mrp: Number.isFinite(Number(item.mrp)) ? Number(item.mrp) : price,
    discountPercent: Number.isFinite(Number(item.discount_percent)) ? Number(item.discount_percent) : 0,
    stock: sku.available === false ? 0 : (Number.isFinite(stockValue) ? Math.max(0, stockValue) : 1),
    brand: String(item.brand || 'Myntra brand'),
    category: String(item.category || item.sub_category || searchCategory),
    gender: String(item.gender || ''),
    image: images[0] || '',
    images,
    sourceUrl: typeof item.url === 'string' && /^https:\/\/(www\.)?myntra\.com\//i.test(item.url) ? item.url : '',
    sourceName: 'Myntra via ReefAPI'
  };
}

async function refreshMyntraCatalogue() {
  const key = process.env.MYNTRA_API_KEY;
  if (!key) return { refreshed: false, warning: 'Myntra catalogue is not connected yet. Add your ReefAPI key as MYNTRA_API_KEY in .env.' };
  if (refreshInFlight) return refreshInFlight;
  if (Date.now() - lastRefreshAt < CATALOG_TTL_MS) return { refreshed: false };

  refreshInFlight = (async () => {
    // This is a third-party API integration, not the official Myntra seller API.
    // The official Myntra developer APIs are intended for approved marketplace sellers.
    

const searches = [
    'men clothing shoes accessories',
    'women clothing shoes accessories',
    'streetwear men women',
    'bags watches jewellery sunglasses',
    'beauty skincare makeup fragrance',
    'fashion sale trending'
  ];


    const settled = await Promise.allSettled(searches.map(async (query) => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 8000);
      try {
        const response = await fetch('https://api.reefapi.com/myntra/v1/search', {
          method: 'POST',
          headers: { 'x-api-key': key, 'content-type': 'application/json', accept: 'application/json' },
          body: JSON.stringify({ query, page: 1, limit: 50 }),
          signal: controller.signal
        });
        if (!response.ok) throw new Error(`Myntra provider returned HTTP ${response.status}`);
        const payload = await response.json();
        if (payload.ok === false) throw new Error(payload.error?.message || 'Myntra provider request failed');
        const rows = payload.data?.results || payload.data?.products || [];
        return rows.map((item) => toMyntraProduct(item, query)).filter(Boolean);
      } finally {
        clearTimeout(timer);
      }
    }));const remote = settled.filter((r) => r.status === 'fulfilled').flatMap((r) => r.value);
    if (!remote.length) {
      const errors = settled.filter((r) => r.status === 'rejected');
      throw new Error(errors[0]?.reason?.message || 'The provider returned no Myntra products. Check the API key and provider access.');
    }
    const unique = [...new Map(remote.map((item) => [item.externalId, item])).values()];
    await Product.bulkWrite(unique.map((item) => ({ updateOne: { filter: { externalId: item.externalId }, update: { $set: item }, upsert: true } })), { ordered: false });
    lastRefreshAt = Date.now();
    return { refreshed: true, onlineCount: unique.length, warning: settled.some((r) => r.status === 'rejected') ? 'Some Myntra category searches failed; showing the products fetched successfully.' : '' };
  })();

  try { return await refreshInFlight; }
  finally { refreshInFlight = null; }
}

router.get('/sync-online', wrap(async (req, res) => {
  let refreshInfo = {};
  try {
    refreshInfo = await refreshMyntraCatalogue();
  } catch (error) {
    refreshInfo = { warning: `Could not refresh Myntra products: ${error.message}. Showing the last saved Myntra catalogue if available.` };
  }

  const q = { externalId: /^myntra-reefapi-/ };
  if (req.query.search) q.name = new RegExp(escapeRegex(req.query.search), 'i');
  const products = await Product.find(q).sort('name');
  const warning = refreshInfo.warning || (!products.length ? 'No Myntra products are saved yet. Add a valid MYNTRA_API_KEY to .env, then reload this page.' : '');
  res.json({ products, source: products.length ? 'myntra-provider' : 'not-connected', onlineCount: refreshInfo.onlineCount || products.length, warning });
}));

router.get('/:id', wrap(async (req, res) => {
  const p = await Product.findById(req.params.id);
  p ? res.json(p) : res.status(404).json({ error: 'Product not found' });
}));

router.post('/', auth, admin, wrap(async (req, res) => res.status(201).json(await Product.create(pick(req.body)))));

router.put('/:id', auth, admin, wrap(async (req, res) => {
  const p = await Product.findByIdAndUpdate(req.params.id, pick(req.body), { new: true, runValidators: true });
  p ? res.json(p) : res.status(404).json({ error: 'Product not found' });
}));

router.delete('/:id', auth, admin, wrap(async (req, res) => {
  await Product.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
}));

module.exports = router;
