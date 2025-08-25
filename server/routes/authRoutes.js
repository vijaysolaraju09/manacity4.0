const express = require('express');
const { signup, login, adminLogin, verifyOtp } = require('../controllers/authController');
const validate = require('../middleware/validate');
const { signupSchema, loginSchema, otpSchema } = require('../validators/authSchemas');

const router = express.Router();

router.post('/signup', validate(signupSchema), signup);
router.post('/login', validate(loginSchema), login);
router.post('/verify-otp', validate(otpSchema), verifyOtp);
router.post('/admin-login', adminLogin);

module.exports = router;
