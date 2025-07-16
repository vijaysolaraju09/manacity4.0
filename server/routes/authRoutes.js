const express = require("express");
const { body } = require("express-validator");
const { signup, login, adminLogin } = require("../controllers/authController");

const router = express.Router();

router.post(
  "/signup",
  [
    body("name").notEmpty(),
    body("phone").notEmpty(),
    body("password").isLength({ min: 6 }),
    body("location").notEmpty(),
    body("role").optional().isIn(["customer", "business"]),
  ],
  signup
);

router.post(
  "/login",
  [body("phone").notEmpty(), body("password").notEmpty()],
  login
);

router.post("/admin-login", adminLogin);

module.exports = router;
