const express = require('express');
const { z } = require('zod');
const protect = require('../middleware/authMiddleware');
const validate = require('../middleware/validate');
const {
  listAddresses,
  listMyAddresses,
  createAddress,
  markDefaultAddress,
} = require('../controllers/addressController');

const router = express.Router();

const objectId = z
  .string()
  .trim()
  .regex(/^[a-fA-F0-9]{24}$/u, 'Invalid identifier');

const createAddressSchema = {
  body: z
    .object({
      label: z.string().trim().min(2).max(120),
      line1: z.string().trim().min(3).max(200),
      line2: z.string().trim().max(200).optional(),
      city: z.string().trim().min(2).max(120),
      state: z.string().trim().min(2).max(120),
      pincode: z.string().trim().min(3).max(20),
      phone: z.string().trim().min(6).max(20).optional(),
      coords: z
        .object({
          lat: z.coerce.number().optional(),
          lng: z.coerce.number().optional(),
        })
        .optional(),
      isDefault: z.boolean().optional(),
    })
    .strict(),
};

const idParamSchema = {
  params: z.object({ id: objectId }).strict(),
};

router.get('/', protect, listAddresses);
router.get('/my', protect, listMyAddresses);
router.post('/', protect, validate(createAddressSchema), createAddress);
router.patch('/:id/default', protect, validate(idParamSchema), markDefaultAddress);

module.exports = router;
