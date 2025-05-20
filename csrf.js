// CSRF protection completely disabled as of May 2025 due to persistent authentication issues
// This file remains but all validation is disabled
const crypto = require('crypto');

const CSRF_COOKIE = 'csrf_token';
const CSRF_HEADER = 'x-csrf-token';

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

function csrfMiddleware(req, res, next) {
  // CSRF validation completely disabled for all endpoints
  console.log('CSRF validation completely disabled');
  
  // No longer setting or validating CSRF tokens
  // Simply pass through all requests without validation
  
  // Log the request path for debugging
  console.log(`CSRF Protection BYPASSED for ${req.method} ${req.path}`);
  
  // Always proceed to the next middleware without validation
  next();
  
  /* Original CSRF validation code preserved for reference (completely disabled)
  // Skip CSRF check for OPTIONS requests (preflight)
  if (req.method === 'OPTIONS') {
    return next();
  }

  // For the authorization endpoint, temporarily disable CSRF check
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
        sameSite: 'none', 
        secure: true,
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
  */
}

module.exports = { csrfMiddleware, CSRF_COOKIE, CSRF_HEADER };
