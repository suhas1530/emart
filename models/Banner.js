const mongoose = require("mongoose");

const bannerSchema = new mongoose.Schema(
  {
    name: String,
    image: String,
    description: String,
    contact: String,
    shopLink: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model("Banner", bannerSchema);
