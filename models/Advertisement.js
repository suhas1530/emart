const mongoose = require("mongoose");

const advertisementSchema = new mongoose.Schema(
  {
    heading: String,
    description: String,
    learnMore: String,
    contact: String,
    media: String,
    logo: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model("Advertisement", advertisementSchema);
