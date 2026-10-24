const router = require('express').Router();
const mongoose = require('mongoose');
const { Order, Product } = require('../models');
const { auth, admin, wrap } = require('../authMiddleware');

const normalizeItems = (items) => {
  if (!Array.isArray(items) || !items.length || items.length > 50) return null;
  return items.map((item) => ({
    productId: String(item?.productId || ''),
    qty: Number(item?.qty),
  }));
};

router.post('/', auth, wrap(async (req, res) => {
  const items = normalizeItems(req.body.items);
  const address = String(req.body.address || '').trim();
  if (!items || address.length < 10 || address.length > 500)
    return res.status(400).json({ error: 'Valid cart items and a 10-500 character address are required' });
  if (items.some((item) => !mongoose.isValidObjectId(item.productId) || !Number.isInteger(item.qty) || item.qty < 1 || item.qty > 100))
    return res.status(400).json({ error: 'Invalid cart item' });

  const unique = new Map();
  for (const item of items) unique.set(item.productId, (unique.get(item.productId) || 0) + item.qty);
  const session = await mongoose.startSession();
  try {
    let order;
    await session.withTransaction(async () => {
      const ids = [...unique.keys()];
      const products = await Product.find({ _id: { $in: ids } }).session(session);
      if (products.length !== ids.length) throw Object.assign(new Error('One or more products are no longer available'), { status: 400 });

      const byId = new Map(products.map((p) => [String(p._id), p]));
      const orderItems = [];
      let total = 0;

      for (const [productId, qty] of unique) {
        const p = byId.get(productId);
        if (!p || p.stock < qty) throw Object.assign(new Error('An item is out of stock or no longer available'), { status: 400 });
        const result = await Product.updateOne(
          { _id: p._id, stock: { $gte: qty } },
          { $inc: { stock: -qty } },
          { session }
        );
        if (result.modifiedCount !== 1) throw Object.assign(new Error('An item went out of stock. Please retry checkout.'), { status: 409 });
        orderItems.push({ product: p._id, name: p.name, price: p.price, qty });
        total += p.price * qty;
      }
      [order] = await Order.create([{ user: req.user.id, items: orderItems, total, address }], { session });
    });
    res.status(201).json(order);
  } finally {
    await session.endSession();
  }
}));

router.get('/mine', auth, wrap(async (req, res) => {
  res.json(await Order.find({ user: req.user.id }).sort('-createdAt'));
}));

router.get('/', auth, admin, wrap(async (req, res) => {
  res.json(await Order.find().populate('user', 'name email').sort('-createdAt').limit(500));
}));

router.patch('/:id/status', auth, admin, wrap(async (req, res) => {
  const allowed = ['Pending', 'Shipped', 'Delivered', 'Cancelled'];
  if (!allowed.includes(req.body.status)) return res.status(400).json({ error: 'Invalid order status' });
  const o = await Order.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true, runValidators: true });
  o ? res.json(o) : res.status(404).json({ error: 'Order not found' });
}));

module.exports = router;
