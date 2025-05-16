// Simple CSRF protection middleware for Express
// Generates a CSRF token, sets it in a httpOnly, sameSite cookie, and validates it on state-changing requests
const crypto = require('crypto');

const CSRF_COOKIE = 'csrf_token';
const CSRF_HEADER = 'x-csrf-token';

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

function csrfMiddleware(req, res, next) {
  // Only set token for GET requests
  if (req.method === 'GET') {
    let token = req.cookies?.[CSRF_COOKIE];
    if (!token) {
      token = generateToken();
      res.cookie(CSRF_COOKIE, token, {
        httpOnly: true,
        sameSite: 'strict',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
      });
    }
    return next();
  }

  // For state-changing requests, require the token
  const cookieToken = req.cookies?.[CSRF_COOKIE];
  const headerToken = req.headers[CSRF_HEADER];
  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    return res.status(403).json({ error: 'Invalid CSRF token' });
  }
  next();
}

module.exports = { csrfMiddleware, CSRF_COOKIE, CSRF_HEADER };
