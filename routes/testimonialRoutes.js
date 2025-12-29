const express = require("express");
const router = express.Router();
const testimonialCtrl = require("../controllers/testimonialController");

router.post("/", testimonialCtrl.createTestimonial);
router.get("/", testimonialCtrl.getTestimonials);
router.put("/:id", testimonialCtrl.updateTestimonial);
router.delete("/:id", testimonialCtrl.deleteTestimonial);

module.exports = router;
