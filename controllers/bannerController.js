const Banner = require("../models/Banner");
const sharp = require("sharp");
const path = require("path");
const fs = require("fs");

// relative to backend root
const UPLOAD_DIR = path.join(__dirname, "..", "uploads", "temp");

// create folder if not exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

exports.createBanner = async (req, res) => {
  try {
    const { name, description, contact, shopLink } = req.body;

    if (!req.file) {
      return res.status(400).json({ error: "Image required" });
    }

    const fileName = `${Date.now()}.webp`;
    const fullPath = path.join(UPLOAD_DIR, fileName);

    await sharp(req.file.buffer)
      .resize(1200)
      .webp({ quality: 70 })
      .toFile(fullPath);

    const banner = await Banner.create({
      name,
      description,
      contact,
      shopLink,
      // store relative path only
      image: `/uploads/temp/${fileName}`,
    });

    res.json(banner);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getBanners = async (req, res) => {
  const banners = await Banner.find().sort({ createdAt: -1 });
  res.json(banners);
};

exports.updateBanner = async (req, res) => {
  const banner = await Banner.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
  });
  res.json(banner);
};

exports.deleteBanner = async (req, res) => {
  const banner = await Banner.findById(req.params.id);

  if (banner?.image) {
    const imgPath = path.join(__dirname, "..", banner.image);
    if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);
  }

  await Banner.findByIdAndDelete(req.params.id);
  res.json({ message: "Banner deleted" });
};
