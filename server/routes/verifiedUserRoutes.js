const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const {
  applyForVerification,
  getAllVerifiedUsers,
  markInterest,
  getMyRequests,
  acceptRequest,
  getAcceptedProviders,
} = require("../controllers/verifiedUserController");

router.post("/apply", protect, applyForVerification);
router.get("/all", protect, getAllVerifiedUsers);
router.post("/interest/:id", protect, markInterest);
router.get("/requests", protect, getMyRequests);
router.post("/accept/:userId", protect, acceptRequest);
router.get("/accepted", protect, getAcceptedProviders);

module.exports = router;
