const router = require('express').Router();
const { Order, Product } = require('../models');
const { auth, admin, wrap } = require('../authMiddleware');

// Checkout: prices and totals are computed on the server, never trusted from the client
router.post('/', auth, wrap(async (req, res) => {
  const { items, address } = req.body;
  if (!Array.isArray(items) || !items.length || !address)
    return res.status(400).json({ error: 'Cart items and address are required' });

  const orderItems = [];
  let total = 0;
  for (const { productId, qty } of items) {
    const n = parseInt(qty, 10);
    if (!(n > 0)) return res.status(400).json({ error: 'Invalid quantity' });
    // atomic stock decrement avoids overselling
    const p = await Product.findOneAndUpdate({ _id: productId, stock: { $gte: n } }, { $inc: { stock: -n } }, { new: true });
    if (!p) {
      for (const it of orderItems) await Product.findByIdAndUpdate(it.product, { $inc: { stock: it.qty } }); // roll back
      return res.status(400).json({ error: 'An item is out of stock or no longer available' });
    }
    orderItems.push({ product: p._id, name: p.name, price: p.price, qty: n });
    total += p.price * n;
  }
  res.status(201).json(await Order.create({ user: req.user.id, items: orderItems, total, address }));
}));

router.get('/mine', auth, wrap(async (req, res) => res.json(await Order.find({ user: req.user.id }).sort('-createdAt'))));

router.get('/', auth, admin, wrap(async (req, res) =>
  res.json(await Order.find().populate('user', 'name email').sort('-createdAt'))));

router.patch('/:id/status', auth, admin, wrap(async (req, res) => {
  const o = await Order.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true, runValidators: true });
  o ? res.json(o) : res.status(404).json({ error: 'Order not found' });
}));

module.exports = router;
