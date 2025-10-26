const express = require('express');
const { z } = require('zod');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const protect = require('../middleware/authMiddleware');
const optionalAuth = require('../middleware/optionalAuth');
const ensureAdmin = require('../middleware/ensureAdmin');
const validate = require('../middleware/validate');
const {
  listEvents,
  createEvent,
  getEvent,
  updateEvent,
  publishEvent,
  startEvent,
  completeEvent,
  cancelEvent,
  unregister,
  getMyRegistration,
  postUpdate,
  listUpdates,
  getLeaderboard,
  postLeaderboard,
  updateRegistrationWindow,
  seedBracket,
  getBracket,
  reportMatch,
  verifyMatch,
  attachFormTemplate,
  setEmbeddedForm,
  toggleEventForm,
} = require('../controllers/eventController');
const {
  getEventForm,
  getEventFormPreview,
  submitRegistration,
  listRegistrations,
} = require('../controllers/registrationController');

const registerLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      ok: false,
      error: {
        code: 'TOO_MANY_REQUESTS',
        message: 'Too many registration attempts, please try again later',
      },
      traceId: req.traceId,
    });
  },
});

const fieldSchema = z
  .object({
    id: z.string().trim().min(1).max(80).optional(),
    label: z.string().trim().min(1).max(160),
    type: z.enum([
      'short_text',
      'textarea',
      'number',
      'email',
      'phone',
      'dropdown',
      'radio',
      'checkbox',
      'url',
      'file',
      'datetime',
    ]),
    required: z.boolean().optional(),
    placeholder: z.string().max(240).optional(),
    help: z.string().max(400).optional(),
    options: z.array(z.string()).optional(),
    min: z.number().optional(),
    max: z.number().optional(),
    pattern: z.string().max(160).optional(),
    defaultValue: z.any().optional(),
  })
  .strict();

const attachTemplateSchema = {
  body: z
    .object({
      templateId: z
        .string()
        .trim()
        .regex(/^[a-fA-F0-9]{24}$/u, 'Invalid template id'),
    })
    .strict(),
};

const embedFormSchema = {
  body: z
    .object({
      fields: z.array(fieldSchema).min(1),
    })
    .strict(),
};

const toggleFormSchema = {
  body: z
    .object({
      isActive: z.boolean(),
    })
    .strict(),
};

// Public
router.get('/', optionalAuth, listEvents);
router.get('/:id', getEvent);
router.get('/:id/updates', listUpdates);
router.get('/:id/leaderboard', getLeaderboard);
router.get('/:id/bracket', getBracket);
router.get('/:id/form', getEventForm);
router.get('/:id/form/preview', protect, getEventFormPreview);
router.get('/:id/registrations', optionalAuth, listRegistrations);

// Authenticated user
router.post('/:id/register', protect, registerLimiter, submitRegistration);
router.delete('/:id/register', protect, unregister);
router.get('/:id/registered/me', protect, getMyRegistration);
router.post('/matches/:matchId/report', protect, reportMatch);

// Organizer/Admin
router.post('/', protect, createEvent);
router.patch('/:id', protect, updateEvent);
router.post('/:id/publish', protect, publishEvent);
router.post('/:id/start', protect, startEvent);
router.post('/:id/complete', protect, completeEvent);
router.post('/:id/cancel', protect, cancelEvent);
router.post('/:id/updates', protect, postUpdate);
router.post('/:id/leaderboard', protect, postLeaderboard);
router.patch('/:id/window', protect, ensureAdmin, updateRegistrationWindow);
router.post('/:id/bracket/seed', protect, seedBracket);
router.post('/matches/:matchId/verify', protect, verifyMatch);
router.put('/:id/form/attach', protect, ensureAdmin, validate(attachTemplateSchema), attachFormTemplate);
router.put('/:id/form/embed', protect, ensureAdmin, validate(embedFormSchema), setEmbeddedForm);
router.put('/:id/form/toggle', protect, ensureAdmin, validate(toggleFormSchema), toggleEventForm);

module.exports = router;
