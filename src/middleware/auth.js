const logger = require('../utils/logger');
const authService = require('../services/authService');

// Middleware to verify JWT token and attach user to request
const requireAuth = (req, res, next) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid authorization header' });
    }

    const token = authHeader.slice(7); // Remove 'Bearer ' prefix

    // Verify token
    const decoded = authService.verifyToken(token);

    // Attach user ID to request
    req.userId = decoded.userId;

    next();
  } catch (error) {
    logger.warn('Authentication failed', { error: error.message });
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

// Optional auth - if token provided, verify it; otherwise continue
const optionalAuth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      const decoded = authService.verifyToken(token);
      req.userId = decoded.userId;
    }

    next();
  } catch (error) {
    // Continue without auth
    next();
  }
};

module.exports = {
  requireAuth,
  optionalAuth,
};
