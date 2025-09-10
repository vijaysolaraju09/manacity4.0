const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const isAdmin = require("../middleware/isAdmin");
const {
  applyForVerification,
  getAllVerifiedUsers,
  getVerifiedUserById,
  getAcceptedProviders,
  getVerificationRequests,
  acceptVerificationRequest,
  rejectVerificationRequest,
} = require("../controllers/verifiedUserController");

router.get("/", getAllVerifiedUsers);
router.post("/apply", protect, applyForVerification);
router.get("/all", protect, isAdmin, getAllVerifiedUsers);
router.get("/requests", protect, isAdmin, getVerificationRequests);
router.post("/accept/:userId", protect, isAdmin, acceptVerificationRequest);
router.post("/reject/:userId", protect, isAdmin, rejectVerificationRequest);
router.get("/accepted", protect, getAcceptedProviders);
router.get("/:id", getVerifiedUserById);

module.exports = router;
