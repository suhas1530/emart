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
  trackIPSubmissions,
  errorHandler,
  corsOptions
} = require("./middleware/securityMiddleware");

const app = express();

/* ===== REQUIRED FOR NGINX / PROXY / RATE-LIMIT ===== */
app.set("trust proxy", 1);

/* ================= SECURITY ================= */
app.use(helmetProtection);
app.use(cors(corsOptions));
app.use(parameterPollutionPrevention);

/* ================= BODY PARSER ================= */
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

/* ================= STATIC UPLOADS ================= */
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

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

app.use(
  "/api/vendor",
  trackIPSubmissions,
  quoteSubmissionLimiter,
  require("./routes/vendorroutes_new")
);

app.use(
  "/api/admin/vendor-quotes",
  adminOperationLimiter,
  require("./routes/vendorroutes_new")
);

app.use("/api/admin/basket-items", require("./routes/basketRoutes"));
app.use("/api/admin/basket-item", require("./routes/basketRoutes"));

/* ================= HEALTH CHECK ================= */
app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "Server is running",
    timestamp: new Date(),
    uptime: process.uptime()
  });
});

/* ================= FRONTEND (EXPRESS 5 SAFE) ================= */

// Your confirmed path:
// /home/cruvzadmin/Testing/emart/dist
const distPath = path.join(__dirname, "dist");

// Serve frontend static files
app.use(express.static(distPath));

// SPA fallback — NO wildcard, Express 5 safe
app.use((req, res, next) => {
  // Skip API and uploads
  if (req.path.startsWith("/api") || req.path.startsWith("/uploads")) {
    return next();
  }

  res.sendFile(path.join(distPath, "index.html"), err => {
    if (err) next(err);
  });
});

/* ================= ERROR HANDLER ================= */
app.use(errorHandler);

/* ================= SERVER ================= */
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
});
