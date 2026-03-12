const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { BusinessProfile, Site } = require("../models/siteModel");
const { BasketItem } = require("../models/Basketmodel");

// ================= MULTER SETUP =================
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, "../uploads/site");
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  }
});
const upload = multer({ storage });

const uploadFields = upload.fields([
  { name: "documents", maxCount: 3 },
  { name: "ownerImage", maxCount: 1 },
  { name: "businessLogo", maxCount: 1 }
]);

// ================= BUSINESS PROFILE =================

// GET business profile (member-specific)
router.get("/site/profile/:memberId", async (req, res) => {
  try {
    const profile = await BusinessProfile.findOne({ memberId: req.params.memberId });
    res.json({ success: true, profile: profile || null });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// CREATE or UPDATE business profile
router.post("/site/profile/:memberId", uploadFields, async (req, res) => {
  try {
    const { memberId } = req.params;
    const { businessName, ownerName, gstin, address, pincode, businessDescription, email } = req.body;

    const updateData = {
      memberId,
      businessName, ownerName, gstin, address, pincode, businessDescription, email,
      updatedAt: new Date()
    };

    // Handle file uploads
    if (req.files?.documents) {
      updateData.documents = req.files.documents.map(f => `uploads/site/${f.filename}`);
    }
    if (req.files?.ownerImage?.[0]) {
      updateData.ownerImage = `uploads/site/${req.files.ownerImage[0].filename}`;
    }
    if (req.files?.businessLogo?.[0]) {
      updateData.businessLogo = `uploads/site/${req.files.businessLogo[0].filename}`;
    }

    // Check if reasonably complete
    const filled = [businessName, ownerName, address, pincode, businessDescription].filter(Boolean);
    updateData.isComplete = filled.length >= 3;

    const profile = await BusinessProfile.findOneAndUpdate(
      { memberId },
      updateData,
      { new: true, upsert: true }
    );

    res.json({ success: true, profile });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ================= SITES =================

// GET all sites for a member
router.get("/site/list/:memberId", async (req, res) => {
  try {
    const sites = await Site.find({ memberId: req.params.memberId }).sort({ createdAt: -1 });
    res.json({ success: true, sites });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// CREATE a site
router.post("/site/add", async (req, res) => {
  try {
    const {
      memberId, siteName, siteAddress,
      basketProductIds, trackingProductIds,
      basketProducts, trackingProducts,
      note, messageToAdmin, anyDetails
    } = req.body;

    const site = new Site({
      memberId, siteName, siteAddress,
      basketProductIds: basketProductIds || [],
      trackingProductIds: trackingProductIds || [],
      basketProducts: basketProducts || [],
      trackingProducts: trackingProducts || [],
      note, messageToAdmin, anyDetails,
      status: "Pending"
    });

    await site.save();
    res.json({ success: true, site });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// EDIT a site (full update)
router.put("/site/edit/:siteId", async (req, res) => {
  try {
    const { siteName, siteAddress, basketProductIds, trackingProductIds, basketProducts, trackingProducts, note, messageToAdmin, anyDetails } = req.body;
    const site = await Site.findByIdAndUpdate(
      req.params.siteId,
      { siteName, siteAddress, basketProductIds, trackingProductIds, basketProducts, trackingProducts, note, messageToAdmin, anyDetails, updatedAt: new Date() },
      { new: true }
    );
    res.json({ success: true, site });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// UPDATE site status
router.put("/site/status/:siteId", async (req, res) => {
  try {
    const { status } = req.body;
    const site = await Site.findByIdAndUpdate(
      req.params.siteId,
      { status, updatedAt: new Date() },
      { new: true }
    );
    res.json({ success: true, site });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE a site
router.delete("/site/delete/:siteId", async (req, res) => {
  try {
    await Site.findByIdAndDelete(req.params.siteId);
    res.json({ success: true, message: "Site deleted" });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET basket products for member (reuse existing basket)
router.get("/site/basket-products/:memberId", async (req, res) => {
  try {
    const items = await BasketItem.find({ memberId: req.params.memberId });
    res.json({ success: true, items });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET tracking products for member
router.get("/site/tracking-products/:memberId", async (req, res) => {
  try {
    const items = await BasketItem.find({
      memberId: req.params.memberId,
      requestedForDelivery: true
    });
    res.json({ success: true, items });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});


// ================= ADMIN SITE ROUTES (add these to siteRoutes.js) =================

// GET all members with their site summaries (admin view)
router.get("/admin/all-member-sites", async (req, res) => {
  try {
    const { BusinessProfile, Site } = require("../models/siteModel");
    const { Member } = require("../models/authModel");

    const allSites = await Site.find().sort({ createdAt: -1 });
    const uniqueMemberIds = [...new Set(allSites.map(s => s.memberId))];

    const memberData = await Promise.all(
      uniqueMemberIds.map(async (memberId) => {
        const member = await Member.findOne({ memberId });
        const profile = await BusinessProfile.findOne({ memberId });
        const sites = allSites.filter(s => s.memberId === memberId);

        return {
          memberId,
          // Member auth fields
          memberName: member?.memberName || "Unknown",
          memberEmail: member?.email || "",
          // Full business profile fields
          businessName: profile?.businessName || "",
          businessLogo: profile?.businessLogo || "",
          ownerImage: profile?.ownerImage || "",
          ownerName: profile?.ownerName || "",
          gstin: profile?.gstin || "",
          address: profile?.address || "",
          pincode: profile?.pincode || "",
          businessDescription: profile?.businessDescription || "",
          documents: profile?.documents || [],
          profileEmail: profile?.email || member?.email || "",
          isProfileComplete: profile?.isComplete || false,
          // Site stats
          totalSites: sites.length,
          pendingSites: sites.filter(s => s.status === "Pending").length,
          confirmedSites: sites.filter(s => s.status === "Confirmed").length,
          inProgressSites: sites.filter(s => s.status === "In Progress").length,
          completedSites: sites.filter(s => s.status === "Completed").length,
          cancelledSites: sites.filter(s => s.status === "Cancelled").length,
          sites,
        };
      })
    );

    res.json({ success: true, members: memberData });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET all sites (admin - with optional status filter)
router.get("/admin/sites", async (req, res) => {
  try {
    const { Site } = require("../models/siteModel");
    const { BusinessProfile } = require("../models/siteModel");
    const { Member } = require("../models/authModel");

    const filter = {};
    if (req.query.status) filter.status = req.query.status;

    const sites = await Site.find(filter).sort({ createdAt: -1 });

    // Enrich with member info
    const enriched = await Promise.all(sites.map(async (site) => {
      const member = await Member.findOne({ memberId: site.memberId });
      const profile = await BusinessProfile.findOne({ memberId: site.memberId });
      return {
        ...site.toObject(),
        memberName: member?.memberName || "Unknown",
        memberEmail: member?.email || "",
        businessName: profile?.businessName || "",
        businessLogo: profile?.businessLogo || "",
      };
    }));

    res.json({ success: true, sites: enriched });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;