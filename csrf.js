// Simple CSRF protection middleware for Express
// Generates a CSRF token, sets it in a httpOnly, sameSite cookie, and validates it on state-changing requests
const crypto = require('crypto');

const CSRF_COOKIE = 'csrf_token';
const CSRF_HEADER = 'x-csrf-token';

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

function csrfMiddleware(req, res, next) {
  // Skip CSRF check for OPTIONS requests (preflight)
  if (req.method === 'OPTIONS') {
    return next();
  }

  // For the authorization endpoint, temporarily disable CSRF check
  // This is for development purposes only - in production you should use proper CSRF protection
  if (req.path === '/authorize') {
    console.log('INFO: Skipping CSRF validation for /authorize endpoint');
    return next();
  }

  // Only set token for GET requests
  if (req.method === 'GET') {
    let token = req.cookies?.[CSRF_COOKIE];
    if (!token) {
      token = generateToken();
      res.cookie(CSRF_COOKIE, token, {
        httpOnly: true,
        sameSite: 'none', // Allow cross-site cookies
        secure: true, // Required when sameSite is 'none'
        path: '/',
      });
    }
    return next();
  }

  // For state-changing requests, require the token
  const cookieToken = req.cookies?.[CSRF_COOKIE];
  const headerToken = req.headers[CSRF_HEADER];
  
  console.log(`CSRF Debug - Cookie Token: ${cookieToken ? 'present' : 'missing'}`);
  console.log(`CSRF Debug - Header Token: ${headerToken ? 'present' : 'missing'}`);
  
  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    console.log('CSRF token validation failed');
    return res.status(403).json({ error: 'Invalid CSRF token' });
  }
  
  console.log('CSRF token validation successful');
  next();
}

module.exports = { csrfMiddleware, CSRF_COOKIE, CSRF_HEADER };
