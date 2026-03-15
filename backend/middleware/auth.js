const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  let token;
  if (req.headers.authorization?.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }
  if (!token) {
    console.error('Auth protect: missing token. Authorization header:', req.headers.authorization);
    return res.status(401).json({ success: false, message: 'Not authorized to access this route' });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select('-password');
    if (!req.user) return res.status(401).json({ success: false, message: 'User not found' });
    if (!req.user.isActive) return res.status(401).json({ success: false, message: 'Account is deactivated' });
    next();
  } catch (err) {
    try {
      console.error('Auth protect: token verification failed:', err.message, 'token(clientStart):', (token || '').slice(0, 20));
    } catch (e) {}
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
};

const authorize = (...roles) => (req, res, next) => {
  const effectiveRole = req.user?.role || 'client';

  // Backfill legacy users that may not have role set in older data
  if (!req.user?.role && req.user?._id) {
    User.findByIdAndUpdate(req.user._id, { role: effectiveRole }).catch(() => {});
    req.user.role = effectiveRole;
  }

  if (!roles.includes(effectiveRole)) {
    return res.status(403).json({ success: false, message: 'Not authorized for this role' });
  }
  next();
};

module.exports = { protect, authorize };
