const { admin, firebaseApp } = require('../../config/firebase');
const User = require('../models/User');

/**
 * Authentication middleware
 * Verifies Firebase JWT token and attaches user info to request
 */
const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No authentication token provided' });
    }

    const token = authHeader.split('Bearer ')[1];

    // Attempt to decode as mock token first (dev mode convenience)
    try {
      if (token.length > 5 && !token.includes('.')) { // Simple check to see if it's likely not a JWT
        const decoded = JSON.parse(Buffer.from(token, 'base64').toString());
        if (decoded && decoded.uid && decoded.uid.startsWith('dev_')) {
          req.firebaseUser = decoded;
          const user = await User.findOne({ firebaseId: decoded.uid });
          if (user) req.user = user;
          return next();
        }
      }
    } catch (e) {
      // Not a mock token, continue to Firebase verification
    }

    // Production mode/Real token: verify Firebase token
    if (!firebaseApp) {
      return res.status(500).json({ error: 'Firebase not configured and mock token not used' });
    }

    const decodedToken = await admin.auth().verifyIdToken(token);
    req.firebaseUser = decodedToken;

    // Find user in our database
    const user = await User.findOne({ firebaseId: decodedToken.uid });
    if (user) {
      req.user = user;
    }

    next();
  } catch (error) {
    console.error('Auth middleware error:', error.message);
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

/**
 * Optional auth middleware - doesn't fail if no token present
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.split('Bearer ')[1];

    // Attempt to decode as mock token first
    try {
      if (token.length > 5 && !token.includes('.')) {
        const decoded = JSON.parse(Buffer.from(token, 'base64').toString());
        if (decoded && decoded.uid && decoded.uid.startsWith('dev_')) {
          req.firebaseUser = decoded;
          const user = await User.findOne({ firebaseId: decoded.uid });
          if (user) req.user = user;
          return next();
        }
      }
    } catch (e) {
      // Not a mock token, continue
    }

    if (!firebaseApp) {
      return next();
    }

    const decodedToken = await admin.auth().verifyIdToken(token);
    req.firebaseUser = decodedToken;
    const user = await User.findOne({ firebaseId: decodedToken.uid });
    if (user) req.user = user;
  } catch (error) {
    // Ignore errors in optional auth
  }
  next();
};

module.exports = { authMiddleware, optionalAuth };
