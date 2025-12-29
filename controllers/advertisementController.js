const Advertisement = require("../models/Advertisement");
const fs = require("fs");
const path = require("path");

// Helper function to process uploaded files
const processUploadedFiles = (req) => {
  const adData = { ...req.body };
  const files = req.files;
  
  console.log("Processing uploaded files:", files);
  console.log("Request body:", req.body);
  
  // Process media file if uploaded
  if (files && files.media && files.media[0]) {
    const mediaFile = files.media[0];
    // Save the filename (from temp folder)
    adData.media = mediaFile.filename;
    console.log("Media file saved:", adData.media);
  } else if (req.body.existingMedia) {
    // Keep existing media if no new file uploaded
    adData.media = req.body.existingMedia;
    console.log("Keeping existing media:", adData.media);
  }
  
  // Process logo file if uploaded
  if (files && files.logo && files.logo[0]) {
    const logoFile = files.logo[0];
    // Save the filename (from temp folder)
    adData.logo = logoFile.filename;
    console.log("Logo file saved:", adData.logo);
  } else if (req.body.existingLogo) {
    // Keep existing logo if no new file uploaded
    adData.logo = req.body.existingLogo;
    console.log("Keeping existing logo:", adData.logo);
  }
  
  return adData;
};

// CREATE advertisement
exports.createAd = async (req, res) => {
  try {
    const adData = processUploadedFiles(req);
    console.log("Creating ad with data:", adData);
    
    const ad = await Advertisement.create(adData);
    res.status(201).json(ad);
  } catch (err) {
    console.error("Error creating ad:", err);
    res.status(500).json({ error: err.message });
  }
};

// READ ALL advertisements
exports.getAds = async (req, res) => {
  try {
    const ads = await Advertisement.find().sort({ createdAt: -1 });
    
    res.json(ads);
  } catch (err) {
    console.error("Error fetching ads:", err);
    res.status(500).json({ error: err.message });
  }
};

// UPDATE advertisement
exports.updateAd = async (req, res) => {
  try {
    const adData = processUploadedFiles(req);
    console.log("Updating ad with data:", adData);
    
    const ad = await Advertisement.findByIdAndUpdate(
      req.params.id,
      adData,
      { new: true }
    );
    
    if (!ad) {
      return res.status(404).json({ error: "Advertisement not found" });
    }
    
    console.log("Updated ad:", ad);
    res.json(ad);
  } catch (err) {
    console.error("Error updating ad:", err);
    res.status(500).json({ error: err.message });
  }
};

// DELETE advertisement
exports.deleteAd = async (req, res) => {
  try {
    const ad = await Advertisement.findByIdAndDelete(req.params.id);
    
    if (!ad) {
      return res.status(404).json({ error: "Advertisement not found" });
    }
    
    res.json({ message: "Advertisement deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};