const express = require('express');
const { signup, login, adminLogin, me, logout } = require('../controllers/authController');
const validate = require('../middleware/validate');
const { signupSchema, loginSchema } = require('../validators/authSchemas');
const protect = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/signup', validate(signupSchema), signup);
router.post('/login', validate(loginSchema), login);
router.post('/admin-login', adminLogin);
router.get('/me', protect, me);
router.post('/logout', protect, logout);

module.exports = router;
