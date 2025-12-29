const express = require("express");
const multer = require("multer");
const router = express.Router();
const bannerCtrl = require("../controllers/bannerController");

const storage = multer.memoryStorage();
const upload = multer({ storage });

router.post("/", upload.single("image"), bannerCtrl.createBanner);
router.get("/", bannerCtrl.getBanners);
router.put("/:id", bannerCtrl.updateBanner);
router.delete("/:id", bannerCtrl.deleteBanner);

module.exports = router;
