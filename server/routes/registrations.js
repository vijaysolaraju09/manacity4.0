const express = require('express');
const { z } = require('zod');
const protect = require('../middleware/authMiddleware');
const validate = require('../middleware/validate');
const { updateRegistrationStatus } = require('../controllers/registrationController');

const router = express.Router();

const updateStatusSchema = {
  body: z
    .object({
      status: z.enum(['submitted', 'accepted', 'rejected', 'waitlisted']),
      contact: z.string().optional(),
    })
    .strict(),
};

router.put('/:id/status', protect, validate(updateStatusSchema), updateRegistrationStatus);

module.exports = router;
