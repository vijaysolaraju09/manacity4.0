const express = require("express");
const router = express.Router();
const {
  getBanner,
  getOffers,
  getVerifiedUsers,
  getEvents,
  getSpecialProducts,
} = require("../controllers/homeController");

router.get("/banner", getBanner);
router.get("/offers", getOffers);
router.get("/verified-users", getVerifiedUsers);
router.get("/events", getEvents);
router.get("/special-products", getSpecialProducts);

module.exports = router;
