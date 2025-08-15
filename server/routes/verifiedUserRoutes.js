const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const protectAdmin = require("../middleware/adminAuth");
const {
  applyForVerification,
  getAllVerifiedUsers,
  getAcceptedProviders,
  getVerificationRequests,
  acceptVerificationRequest,
  rejectVerificationRequest,
} = require("../controllers/verifiedUserController");

router.post("/apply", protect, applyForVerification);
router.get("/all", protect, getAllVerifiedUsers);
router.get("/requests", protectAdmin, getVerificationRequests);
router.post("/accept/:userId", protectAdmin, acceptVerificationRequest);
router.post("/reject/:userId", protectAdmin, rejectVerificationRequest);
router.get("/accepted", protect, getAcceptedProviders);

module.exports = router;
