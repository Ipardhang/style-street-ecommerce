const jwt = require('jsonwebtoken');

exports.auth = (req, res, next) => {
  const token = (req.headers.authorization || '').replace('Bearer ', '');
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

// wraps async handlers so errors reach the error middleware
exports.wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);
