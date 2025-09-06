const express = require('express');
const { signup, login, adminLogin } = require('../controllers/authController');
const validate = require('../middleware/validate');
const { signupSchema, loginSchema } = require('../validators/authSchemas');

const router = express.Router();

router.post('/signup', validate(signupSchema), signup);
router.post('/login', validate(loginSchema), login);
router.post('/admin-login', adminLogin);

module.exports = router;
