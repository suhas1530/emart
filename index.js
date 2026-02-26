const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

/* ================= SECURITY MIDDLEWARE ================= */
const {
  quoteSubmissionLimiter,
  apiLimiter,
  adminOperationLimiter,
  parameterPollutionPrevention,
  helmetProtection,
  errorHandler,
  corsOptions
} = require("./middleware/securityMiddleware");

const app = express();

/* ===== REQUIRED FOR NGINX / PROXY ===== */
app.set("trust proxy", 1);

/* ================= SECURITY ================= */
app.use(cors(corsOptions));
app.use(helmetProtection);
app.use(parameterPollutionPrevention);

/* ================= BODY PARSER ================= */
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

/* ================= STATIC UPLOADS ================= */
app.use(
  "/uploads",
  express.static(path.join(__dirname, "uploads"), {
    setHeaders: (res) => {
      res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Cache-Control", "public, max-age=31536000");
    },
  })
);

/* ================= DATABASE ================= */
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch(err => console.error("❌ MongoDB connection error:", err));

/* ================= API LIMITER ================= */
app.use("/api", apiLimiter);

/* ================= API ROUTES ================= */
app.use("/api/brands", require("./routes/brandsroute"));
app.use("/api/ads", require("./routes/advertisementRoutes"));
app.use("/api/banners", require("./routes/bannerRoutes"));
app.use("/api/testimonials", require("./routes/testimonialRoutes"));

/* ================= VENDOR ROUTES ================= */
app.use(
  "/api/vendor",
  quoteSubmissionLimiter,
  require("./routes/vendorroutes_new")
);

/* ================= ADMIN ROUTES ================= */
app.use(
  "/api/admin/vendor-quotes",
  adminOperationLimiter,
  require("./routes/vendorroutes_new")
);

app.use("/api/admin/basket-items", require("./routes/basketRoutes"));
app.use("/api/admin/basket-item", require("./routes/basketRoutes"));

/* ================= 🔧 FIX: ADMIN VENDOR QUOTES GET ================= */
/* This fixes: Cannot GET /api/admin/vendor-quotes */
app.get(
  "/api/admin/vendor-quotes",
  adminOperationLimiter,
  async (req, res) => {
    try {
      const VendorQuote = require("./models/VendorQuote");

      const quotes = await VendorQuote.find().sort({ createdAt: -1 });

      res.json({
        success: true,
        quotes
      });
    } catch (error) {
      console.error("Admin vendor quotes fetch error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch vendor quotes"
      });
    }
  }
);

/* ================= HEALTH CHECK ================= */
app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "Server is running",
    timestamp: new Date(),
    uptime: process.uptime()
  });
});

/* ================= FRONTEND ================= */
const distPath = path.join(__dirname, "dist");

app.use(express.static(distPath));

app.use((req, res, next) => {
  if (req.path.startsWith("/api") || req.path.startsWith("/uploads")) {
    return next();
  }
  res.sendFile(path.join(distPath, "index.html"));
});

/* ================= ERROR HANDLER ================= */
app.use(errorHandler);

/* ================= SERVER ================= */
const PORT = process.env.PORT || 8080;

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});

