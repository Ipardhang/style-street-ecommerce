const jwt = require('jsonwebtoken');

exports.auth = (req, res, next) => {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) return res.status(401).json({ error: 'Please log in' });
  const token = header.slice(7).trim();
  if (!token) return res.status(401).json({ error: 'Please log in' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Please log in' });
  }
};

exports.admin = (req, res, next) =>
  req.user && req.user.role === 'admin'
    ? next()
    : res.status(403).json({ error: 'Admin access only' });

exports.rateLimit = ({ windowMs = 15 * 60 * 1000, max = 20 } = {}) => {
  const buckets = new Map();
  return (req, res, next) => {
    const now = Date.now();
    const key = req.ip || req.socket.remoteAddress || 'unknown';
    const bucket = buckets.get(key);
    if (!bucket || now - bucket.startedAt >= windowMs) {
      buckets.set(key, { startedAt: now, count: 1 });
      return next();
    }
    bucket.count += 1;
    if (bucket.count > max) {
      res.set('Retry-After', String(Math.ceil((windowMs - (now - bucket.startedAt)) / 1000)));
      return res.status(429).json({ error: 'Too many requests. Please try again later.' });
    }
    next();
    if (buckets.size > 5000) {
      for (const [entryKey, entry] of buckets) {
        if (now - entry.startedAt >= windowMs) buckets.delete(entryKey);
      }
    }
  };
};

exports.wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
