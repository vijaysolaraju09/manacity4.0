const express = require('express');
const { z } = require('zod');
const router = express.Router();
const protect = require('../middleware/authMiddleware');
const validate = require('../middleware/validate');
const roleMiddleware = require('../middleware/roleMiddleware');
const {
  createOrder,
  checkoutOrders,
  getMyOrders,
  getReceivedOrders,
  getOrderById,
  updateOrderStatus,
  cancelOrder,
  rateOrder,
} = require('../controllers/orderController');

const objectId = z
  .string()
  .trim()
  .regex(/^[a-fA-F0-9]{24}$/u, 'Invalid identifier');

const orderItemSchema = z
  .object({
    productId: objectId,
    qty: z.coerce.number().int().min(1).max(999).optional(),
    quantity: z.coerce.number().int().min(1).max(999).optional(),
    options: z.record(z.unknown()).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.qty === undefined && value.quantity === undefined) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Quantity required', path: ['qty'] });
    }
  })
  .transform(({ productId, qty, quantity, options }) => ({
    productId,
    qty: qty ?? quantity ?? 1,
    options: options ?? {},
  }));

const shippingSchema = z
  .object({
    name: z.string().trim().max(120).optional(),
    label: z.string().trim().max(120).optional(),
    phone: z.string().trim().max(20).optional(),
    address1: z.string().trim().max(200).optional(),
    address2: z.string().trim().max(200).optional(),
    landmark: z.string().trim().max(200).optional(),
    city: z.string().trim().max(120).optional(),
    state: z.string().trim().max(120).optional(),
    pincode: z.string().trim().max(20).optional(),
    referenceId: objectId.optional(),
    geo: z
      .object({
        lat: z.coerce.number().optional(),
        lng: z.coerce.number().optional(),
      })
      .optional(),
  })
  .partial()
  .strict();

const baseOrderSchema = z
  .object({
    items: z.array(orderItemSchema).min(1),
    addressId: objectId.optional(),
    shippingAddress: shippingSchema.optional(),
    paymentMethod: z.string().trim().max(32).optional(),
    payment: z.record(z.unknown()).optional(),
    fulfillment: z.record(z.unknown()).optional(),
    fulfillmentType: z.enum(['delivery', 'pickup']).optional(),
    notes: z.string().trim().max(500).optional(),
  })
  .strict();

const createOrderSchema = {
  body: baseOrderSchema.extend({ shopId: objectId }),
};

const checkoutOrderSchema = {
  body: baseOrderSchema,
};

const listQuerySchema = {
  query: z
    .object({
      status: z.string().trim().max(32).optional(),
      page: z.coerce.number().int().min(1).optional(),
      pageSize: z.coerce.number().int().min(1).max(100).optional(),
    })
    .strict(),
};

const idParamSchema = {
  params: z.object({ id: objectId }).strict(),
};

const updateStatusSchema = {
  ...idParamSchema,
  body: z
    .object({
      status: z.string().trim().max(40),
      note: z.string().trim().max(240).optional(),
    })
    .strict(),
};

const cancelSchema = {
  ...idParamSchema,
  body: z.object({ reason: z.string().trim().max(240).optional() }).strict(),
};

const rateSchema = {
  ...idParamSchema,
  body: z
    .object({
      rating: z.coerce.number().int().min(1).max(5),
      review: z.string().trim().max(1000).optional(),
    })
    .strict(),
};

router.post('/', protect, validate(createOrderSchema), createOrder);
router.post('/checkout', protect, validate(checkoutOrderSchema), checkoutOrders);
router.get('/mine', protect, validate(listQuerySchema), getMyOrders);
router.get(
  '/received',
  protect,
  roleMiddleware(['business', 'admin']),
  validate(listQuerySchema),
  getReceivedOrders,
);
router.get('/:id', protect, validate(idParamSchema), getOrderById);
router.patch(
  '/:id/status',
  protect,
  roleMiddleware(['business', 'admin']),
  validate(updateStatusSchema),
  updateOrderStatus,
);
router.patch('/:id/cancel', protect, validate(cancelSchema), cancelOrder);
router.post('/:id/rate', protect, validate(rateSchema), rateOrder);

module.exports = router;

