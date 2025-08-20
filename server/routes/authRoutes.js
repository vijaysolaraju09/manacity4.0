const express = require("express");
const { body } = require("express-validator");
const { login, adminLogin } = require("../controllers/authController");
const { z } = require("zod");
const { verifyIdToken } = require("../lib/firebaseAdmin");
const { createUserIfNew, issueResetTokenForPhone } = require("../services/authService");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const User = require("../models/User");

const router = express.Router();

router.post(
  "/login",
  [body("phone").notEmpty(), body("password").notEmpty()],
  login
);

router.post("/admin-login", adminLogin);

const verifySchema = z.object({
  idToken: z.string().min(10),
  purpose: z.enum(["signup", "reset"]),
  signupDraft: z
    .object({
      name: z.string().min(2),
      phone: z.string().regex(/^\+\d{10,15}$/),
      password: z.string().min(6),
      location: z.string().min(2),
    })
    .optional(),
});

router.post("/verify-firebase", async (req, res) => {
  try {
    const { idToken, purpose, signupDraft } = verifySchema.parse(req.body);
    const decoded = await verifyIdToken(idToken);
    const phone = decoded.phone_number;
    if (!phone) return res.status(400).json({ error: "Phone not present in token" });

    if (purpose === "signup") {
      if (!signupDraft || signupDraft.phone !== phone) {
        return res.status(400).json({ error: "Signup payload missing or phone mismatch" });
      }
      const result = await createUserIfNew(signupDraft);
      if (result.existing) {
        return res.status(409).json({ error: "Phone already registered" });
      }
      return res.json({ ok: true, user: result.user, token: result.token });
    }

    if (purpose === "reset") {
      const token = await issueResetTokenForPhone(phone);
      return res.json({ ok: true, token });
    }

    return res.status(400).json({ error: "Invalid purpose" });
  } catch (err) {
    return res.status(400).json({ error: "Invalid or expired OTP token" });
  }
});

const setSchema = z.object({
  token: z.string().min(10),
  newPassword: z.string().min(6),
});

router.post("/set-password", async (req, res) => {
  try {
    const { token, newPassword } = setSchema.parse(req.body);
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findOne({ _id: payload.userId, phone: payload.phone });
    if (!user) return res.status(404).json({ error: "User not found" });
    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();
    return res.json({ ok: true });
  } catch (err) {
    return res.status(400).json({ error: "Invalid or expired token" });
  }
});

module.exports = router;
