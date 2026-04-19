// middleware/securityMiddleware.js - Rate limiting, validation, and sanitization

const rateLimit = require("express-rate-limit");
const mongoSanitize = require("express-mongo-sanitize");
const helmet = require("helmet");
// const xss = require('xss-clean'); // Disabled: incompatible with Express 5.x
const hpp = require("hpp");

/* ================= RATE LIMITERS ================= */

// Rate limiter for quote submissions
const quoteSubmissionLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 50,
  message: "Too many quote submissions from this IP, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.user?.role === "admin"
});

// General API limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: "Too many requests from this IP, please try again later.",
  standardHeaders: true,
  legacyHeaders: false
});

// Admin operations limiter
const adminOperationLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: "Too many admin operations, please try again later.",
  standardHeaders: true,
  legacyHeaders: false
});

/* ================= SANITIZATION ================= */

const sanitizeData = (req, res, next) => next();
const xssProtection = (req, res, next) => next();

/* ================= PARAMETER POLLUTION ================= */

const parameterPollutionPrevention = hpp({
  whitelist: [
    "page",
    "limit",
    "sort",
    "status",
    "itemId",
    "vendorName",
    "startDate",
    "endDate"
  ]
});

/* ================= HELMET SECURITY HEADERS ================= */

const helmetProtection = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],

      scriptSrc: [
        "'self'",
        "'unsafe-inline'",
        "'unsafe-eval'"
      ],

      styleSrc: [
        "'self'",
        "'unsafe-inline'"
      ],

      imgSrc: [
        "'self'",
        "data:",
        "blob:",
        "https:"
      ],

      fontSrc: [
        "'self'",
        "data:",
        "https:"
      ],

      connectSrc: [
        "'self'",
        "https://basavamart.com",
        "https://www.basavamart.com",
        "https://userpanel.basavamart.com",
        "https://admin.basavamart.com",
        "https://emart.basavamart.com",
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:3000"
      ],

      objectSrc: ["'none'"],
      upgradeInsecureRequests: []
    }
  },
  referrerPolicy: { policy: "same-origin" }
});

/* ================= VENDOR INPUT VALIDATION ================= */

const validateVendorInput = (req, res, next) => {
  const { vendorName, vendorEmail, remarks, adminNotes } = req.body;

  if (vendorName) req.body.vendorName = vendorName.trim().substring(0, 100);
  if (vendorEmail) req.body.vendorEmail = vendorEmail.trim().toLowerCase();
  if (remarks) req.body.remarks = remarks.trim().substring(0, 500);
  if (adminNotes) req.body.adminNotes = adminNotes.trim().substring(0, 1000);

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
          message: "Invalid input detected."
        });
      }
    }
  }

  next();
};

/* ================= IP RATE TRACKING ================= */

const ipSubmissionCache = new Map();

const trackIPSubmissions = (req, res, next) => {
  const ip = req.ip || req.connection.remoteAddress;
  const now = Date.now();
  const oneHourAgo = now - 3600000;

  if (!ipSubmissionCache.has(ip)) {
    ipSubmissionCache.set(ip, []);
  }

  const submissions = ipSubmissionCache.get(ip);
  const recentSubmissions = submissions.filter(time => time > oneHourAgo);

  if (recentSubmissions.length >= 50) {
    return res.status(429).json({
      success: false,
      message: "Rate limit exceeded. Maximum 50 submissions per hour.",
      retryAfter: Math.ceil((recentSubmissions[0] + 3600000 - now) / 1000)
    });
  }

  recentSubmissions.push(now);
  ipSubmissionCache.set(ip, recentSubmissions);

  next();
};

/* ================= EMAIL VALIDATION ================= */

const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/* ================= PHONE VALIDATION ================= */

const validatePhone = (phone) => {
  if (!phone) return true;
  const phoneRegex =
    /^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/;
  return phoneRegex.test(phone);
};

/* ================= ERROR HANDLER ================= */

const errorHandler = (err, req, res, next) => {
  console.error("Error:", err);

  if (err.name === "ValidationError") {
    const messages = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: messages
    });
  }

  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0];
    return res.status(400).json({
      success: false,
      message: `${field} already exists`
    });
  }

  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || "Internal server error"
  });
};

/* ================= CORS ================= */

const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = [
      "https://basavamart.com",
      "https://www.basavamart.com",
      "https://userpanel.basavamart.com",
      "https://admin.basavamart.com",
      "https://emart.basavamart.com",
      "http://localhost:5173",
      "http://localhost:5174",
      "http://localhost:3000"
    ];

    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS blocked: ${origin}`));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  optionsSuccessStatus: 200
};

/* ================= EXPORTS ================= */

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

