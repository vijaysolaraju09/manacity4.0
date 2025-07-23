const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const protectAdmin = require("../middleware/adminAuth");
const {
  applyForVerification,
  getAllVerifiedUsers,
  markInterest,
  getAcceptedProviders,
  getVerificationRequests,
  acceptVerificationRequest,
  rejectVerificationRequest,
} = require("../controllers/verifiedUserController");

router.post("/apply", protect, applyForVerification);
router.get("/all", protect, getAllVerifiedUsers);
router.post("/interest/:id", protect, markInterest);
router.get("/requests", protectAdmin, getVerificationRequests);
router.post("/accept/:userId", protectAdmin, acceptVerificationRequest);
router.post("/reject/:userId", protectAdmin, rejectVerificationRequest);
router.get("/accepted", protect, getAcceptedProviders);

module.exports = router;
