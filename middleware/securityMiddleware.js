// middleware/securityMiddleware.js - Rate limiting, validation, and sanitization

const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const helmet = require('helmet');
// const xss = require('xss-clean'); // Disabled: incompatible with Express 5.x
const hpp = require('hpp');

// Rate limiter for quote submissions (public endpoint)
const quoteSubmissionLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // TEMPORARILY INCREASED FOR TESTING - Change back to 5 in production
  message: 'Too many quote submissions from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for admin requests
    return req.user?.role === 'admin';
  }
});

// General API rate limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per 15 minutes
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false
});

// Admin operations limiter (stricter for data modifications)
const adminOperationLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 requests per minute
  message: 'Too many admin operations, please try again later.',
  standardHeaders: true,
  legacyHeaders: false
});

// Sanitization middleware
// Disabled: express-mongo-sanitize is incompatible with Express 5.x
// const sanitizeData = mongoSanitize({
//   replaceWith: '_',
//   onSanitize: ({ req, key }) => {
//     console.warn(`Sanitized key: ${key}`);
//   }
// });
const sanitizeData = (req, res, next) => next(); // Dummy middleware

// Input validation and XSS protection
// Disabled: xss-clean is incompatible with Express 5.x and newer Node.js
// const xssProtection = xss();
const xssProtection = (req, res, next) => next(); // Dummy middleware

// Parameter pollution prevention
const parameterPollutionPrevention = hpp({
  whitelist: [
    'page',
    'limit',
    'sort',
    'status',
    'itemId',
    'vendorName',
    'startDate',
    'endDate'
  ]
});

// Helmet for HTTP headers
const helmetProtection = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:']
    }
  },
  referrerPolicy: { policy: 'same-origin' }
});

// Custom validation middleware for vendor quotes
const validateVendorInput = (req, res, next) => {
  const { vendorName, vendorEmail, remarks, adminNotes } = req.body;

  // Trim all string fields
  if (vendorName) req.body.vendorName = vendorName.trim().substring(0, 100);
  if (vendorEmail) req.body.vendorEmail = vendorEmail.trim().toLowerCase();
  if (remarks) req.body.remarks = remarks.trim().substring(0, 500);
  if (adminNotes) req.body.adminNotes = adminNotes.trim().substring(0, 1000);

  // Check for suspicious patterns
  const suspiciousPatterns = [
    /<script/i,
    /javascript:/i,
    /on\w+\s*=/i,
    /\x00/g,
    /\x1b/g
  ];

  const fieldsToCheck = [vendorName, vendorEmail, remarks, adminNotes].filter(Boolean);

  for (const field of fieldsToCheck) {
    for (const pattern of suspiciousPatterns) {
      if (pattern.test(field)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid input detected. Please check your data.'
        });
      }
    }
  }

  next();
};

// IP-based rate limiting cache (in-memory)
const ipSubmissionCache = new Map();

// Custom rate limiter with IP tracking
const trackIPSubmissions = (req, res, next) => {
  const ip = req.ip || req.connection.remoteAddress;
  const now = Date.now();
  const oneHourAgo = now - 3600000;

  if (!ipSubmissionCache.has(ip)) {
    ipSubmissionCache.set(ip, []);
  }

  const submissions = ipSubmissionCache.get(ip);
  const recentSubmissions = submissions.filter(time => time > oneHourAgo);

  if (recentSubmissions.length >= 50) { // TEMPORARILY INCREASED FOR TESTING - Change back to 5
    return res.status(429).json({
      success: false,
      message: 'Rate limit exceeded. Maximum 50 submissions per hour.',
      retryAfter: Math.ceil((recentSubmissions[0] + 3600000 - now) / 1000)
    });
  }

  recentSubmissions.push(now);
  ipSubmissionCache.set(ip, recentSubmissions);

  // Cleanup old entries periodically
  if (recentSubmissions.length > 0 && Math.random() < 0.1) {
    ipSubmissionCache.forEach((times, key) => {
      const filtered = times.filter(time => time > oneHourAgo);
      if (filtered.length === 0) {
        ipSubmissionCache.delete(key);
      } else {
        ipSubmissionCache.set(key, filtered);
      }
    });
  }

  next();
};

// Email validation
const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Phone validation
const validatePhone = (phone) => {
  if (!phone) return true; // Phone is optional
  const phoneRegex = /^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/;
  return phoneRegex.test(phone);
};

// Error handling middleware
const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  // Validation errors
  if (err.array && typeof err.array === 'function') {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: err.array()
    });
  }

  // MongoDB validation errors
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map(e => e.message);
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: messages
    });
  }

  // MongoDB duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0];
    return res.status(400).json({
      success: false,
      message: `${field} already exists`
    });
  }

  // Default error
  return res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || 'Internal server error'
  });
};

// CORS configuration
const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = [
      // Production
      'https://emart.basavamart.com',
      'https://admin.basavamart.com',
      'https://userpanel.basavamart.com',
      // Local development
      'http://localhost:5173',
      'http://localhost:5174',
      'http://localhost:3000',
      'http://127.0.0.1:5173',
      'http://127.0.0.1:3000'
    ];
    // Allow requests with no origin (e.g. mobile apps, Postman, curl)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS: Origin '${origin}' not allowed`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 200
};

module.exports = {
  quoteSubmissionLimiter,
  apiLimiter,
  adminOperationLimiter,
  sanitizeData,
  xssProtection,
  parameterPollutionPrevention,
  helmetProtection,
  validateVendorInput,
  trackIPSubmissions,
  validateEmail,
  validatePhone,
  errorHandler,
  corsOptions
};
