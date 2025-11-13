const express = require('express');
const { z } = require('zod');
const router = express.Router();
const protect = require('../middleware/authMiddleware');
const validate = require('../middleware/validate');
const { submitFeedback } = require('../controllers/feedbackController');

const objectId = z
  .string()
  .trim()
  .regex(/^[a-fA-F\d]{24}$/u, 'Invalid identifier');

const feedbackSchema = {
  body: z
    .object({
      subjectType: z.enum(['order', 'service_request', 'event']),
      subjectId: objectId,
      rating: z.coerce.number().int().min(1).max(5).optional(),
      comment: z.string().trim().max(1000).optional(),
    })
    .strict(),
};

router.post('/', protect, validate(feedbackSchema), submitFeedback);

module.exports = router;
