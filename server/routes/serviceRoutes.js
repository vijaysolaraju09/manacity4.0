const express = require('express');
const { z } = require('zod');
const protect = require('../middleware/authMiddleware');
const ensureAdmin = require('../middleware/ensureAdmin');
const validate = require('../middleware/validate');
const {
  listServices,
  getServiceProviders,
  listServiceProvidersAlias,
  createServiceRequest,
  getMyServiceRequests,
  getAssignedServiceRequests,
  adminUpdateServiceRequest,
} = require('../controllers/servicesController');

const router = express.Router();

const objectId = z
  .string()
  .trim()
  .regex(/^[a-fA-F0-9]{24}$/u, 'Invalid identifier');

const createRequestSchema = {
  body: z
    .object({
      serviceId: objectId.optional(),
      customName: z.string().trim().max(150).optional(),
      description: z.string().trim().max(1000).optional(),
      desc: z.string().trim().max(1000).optional(),
      location: z.string().trim().min(2).max(250),
      phone: z.string().trim().min(6).max(20),
      preferredDate: z.string().trim().max(50).optional(),
      preferredTime: z.string().trim().max(50).optional(),
      visibility: z.enum(['public', 'private']).optional(),
    })
    .strict()
    .superRefine((value, ctx) => {
      if (!value.desc && !value.description) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Please describe the service request',
          path: ['description'],
        });
      }
    })
    .transform((value) => {
      const next = { ...value };
      if (!next.desc && next.description) {
        next.desc = next.description;
      }
      if (!next.description && next.desc) {
        next.description = next.desc;
      }
      return next;
    }),
};

const updateRequestSchema = {
  params: z.object({ id: objectId }).strict(),
  body: z
    .object({
      providerId: objectId.nullable().optional(),
      status: z.string().trim().max(40).optional(),
      adminNotes: z.string().trim().max(1000).optional(),
    })
    .strict(),
};

router.get('/', listServices);
router.get('/providers', listServiceProvidersAlias);
router.get('/:id/providers', getServiceProviders);
router.post('/requests', protect, validate(createRequestSchema), createServiceRequest);
router.get('/requests/my', protect, getMyServiceRequests);
router.get('/requests/assigned', protect, getAssignedServiceRequests);
router.patch(
  '/requests/:id',
  protect,
  ensureAdmin,
  validate(updateRequestSchema),
  adminUpdateServiceRequest,
);

module.exports = router;
