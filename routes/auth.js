const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User } = require('../models');
const { wrap, rateLimit } = require('../authMiddleware');

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10 });
const normalizeEmail = (value) => String(value || '').trim().toLowerCase();
const sign = (u) => ({
  token: jwt.sign({ id: u._id, role: u.role, name: u.name }, process.env.JWT_SECRET, { expiresIn: '7d' }),
  user: { id: u._id, name: u.name, email: u.email, role: u.role },
});

router.post('/register', authLimiter, wrap(async (req, res) => {
  const name = String(req.body.name || '').trim();
  const email = normalizeEmail(req.body.email);
  const password = String(req.body.password || '');
  if (name.length < 2 || name.length > 80 || !/^\S+@\S+\.\S+$/.test(email) || password.length < 6 || password.length > 128)
    return res.status(400).json({ error: 'Enter a valid name, email and a 6-128 character password' });
  if (await User.findOne({ email })) return res.status(409).json({ error: 'Email already registered' });
  const user = await User.create({ name, email, password: await bcrypt.hash(password, 12), role: 'user' });
  res.status(201).json(sign(user));
}));

router.post('/login', authLimiter, wrap(async (req, res) => {
  const email = normalizeEmail(req.body.email);
  const password = String(req.body.password || '');
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });
  const user = await User.findOne({ email });
  if (!user || !(await bcrypt.compare(password, user.password)))
    return res.status(401).json({ error: 'Invalid email or password' });
  res.json(sign(user));
}));

module.exports = router;
