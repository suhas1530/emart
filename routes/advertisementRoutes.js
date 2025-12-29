const express = require("express");
const router = express.Router();
const controller = require("../controllers/advertisementController");
const upload = require("../middleware/upload");


// POST route - create advertisement with file upload
router.post("/", upload.fields([
  { name: 'media', maxCount: 1 },
  { name: 'logo', maxCount: 1 }
]), controller.createAd);

// PUT route - update advertisement with file upload
router.put("/:id", upload.fields([
  { name: 'media', maxCount: 1 },
  { name: 'logo', maxCount: 1 }
]), controller.updateAd);

// GET and DELETE routes remain the same
router.get("/", controller.getAds);
router.delete("/:id", controller.deleteAd);

module.exports = router;