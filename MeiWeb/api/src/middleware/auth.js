'use strict';

const jwt = require('jsonwebtoken');

// =============================================
// AUTH MIDDLEWARE — JWT doğrulama
// Cookie veya Authorization: Bearer header'dan
// token alır, doğrular, req.user'a ekler.
// =============================================

const JWT_SECRET = process.env.JWT_SECRET || 'mei_secret_change_me';

/**
 * Zorunlu kimlik doğrulama middleware'i.
 * Geçersiz/eksik token → 401.
 */
function requireAuth(req, res, next) {
  const token = extractToken(req);

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized — no token provided.' });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload; // { id, username, avatar, accessToken }
    next();
  } catch {
    return res.status(401).json({ error: 'Unauthorized — invalid or expired token.' });
  }
}

/**
 * Opsiyonel kimlik doğrulama middleware'i.
 * Token varsa doğrular, yoksa devam eder.
 */
function optionalAuth(req, res, next) {
  const token = extractToken(req);
  if (token) {
    try {
      req.user = jwt.verify(token, JWT_SECRET);
    } catch {
      // geçersiz token → yoksay
    }
  }
  next();
}

function extractToken(req) {
  // 1) Cookie
  if (req.cookies?.mei_token) return req.cookies.mei_token;
  // 2) Authorization header
  const auth = req.headers.authorization;
  if (auth?.startsWith('Bearer ')) return auth.slice(7);
  return null;
}

/**
 * JWT token üretir.
 * @param {object} payload
 * @returns {string}
 */
function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

module.exports = { requireAuth, optionalAuth, signToken };
