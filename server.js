require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');

for (const key of ['MONGO_URI', 'JWT_SECRET']) {
  if (!process.env[key] || process.env[key].length < (key === 'JWT_SECRET' ? 32 : 1)) {
    console.error(`Missing or unsafe ${key}. Set it in .env before starting the server.`);
    process.exit(1);
  }
}
if (process.env.NODE_ENV === 'production' && process.env.JWT_SECRET === 'change_this_to_a_long_random_string') {
  console.error('Refusing to start with the example JWT secret in production.');
  process.exit(1);
}

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '100kb' }));
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/products', require('./routes/products'));
app.use('/api/orders', require('./routes/orders'));

app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));
app.use((err, req, res, next) => {
  console.error(err);
  if (err.name === 'ValidationError') return res.status(400).json({ error: 'Invalid request data' });
  if (err.name === 'CastError') return res.status(400).json({ error: 'Invalid identifier' });
  if (err.code === 11000) return res.status(409).json({ error: 'A record with that value already exists' });
  res.status(err.status || 500).json({ error: process.env.NODE_ENV === 'production' ? 'Server error' : (err.message || 'Server error') });
});

const PORT = Number(process.env.PORT) || 3000;
mongoose.connect(process.env.MONGO_URI)
  .then(() => app.listen(PORT, () => console.log(`Running on http://localhost:${PORT}`)))
  .catch((e) => { console.error('DB connection failed:', e.message); process.exit(1); });
