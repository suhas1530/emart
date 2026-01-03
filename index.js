// const express = require("express");
// const mongoose = require("mongoose");
// const cors = require("cors");
// require("dotenv").config();

// const app = express();

// app.use(cors());
// app.use(express.json());
// app.use("/uploads", express.static("uploads"));

// // MongoDB connection from .env
// mongoose
//   .connect(process.env.MONGO_URI)
//   .then(() => console.log("MongoDB Connected"))
//   .catch(err => console.error(err));

// app.use("/api/brands", require("./routes/brandsroute"));

// const PORT = process.env.PORT || 4000;
// app.listen(PORT, () => console.log(`Server running on ${PORT}`));


const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();
const path = require("path");


const app = express();

app.use(cors());
app.use(express.json({ limit: '50mb' })); // Increased limit for base64 images
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use("/uploads", express.static("uploads"));

// app.use(
//   "/uploads",
//   express.static(path.join(__dirname, "uploads"))
// );

// MongoDB connection from .env
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch(err => console.error("MongoDB connection error:", err));

// Routes
app.use("/api/brands", require("./routes/brandsroute"));
app.use("/api/ads", require("./routes/advertisementRoutes"));
app.use("/api/banners", require("./routes/bannerRoutes"));
app.use("/api/testimonials", require("./routes/testimonialRoutes"));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ 
    error: err.message || 'Something went wrong!',
    details: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));