const express = require("express");
const router = express.Router();
const {
  getAnnouncement,
  getOffers,
  getVerifiedUsers,
  getEvents,
  getSpecialProducts,
} = require("../controllers/homeController");

router.get("/banner", getAnnouncement);
router.get("/announcement", getAnnouncement);
router.get("/offers", getOffers);
router.get("/verified-users", getVerifiedUsers);
router.get("/events", getEvents);
router.get("/special-products", getSpecialProducts);

module.exports = router;
