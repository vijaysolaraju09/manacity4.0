const express = require("express");
const protect = require("../middleware/authMiddleware");
const { updateMe } = require("../controllers/userController");

const router = express.Router();

router.patch("/me", protect, updateMe);

module.exports = router;
