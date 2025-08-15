const { z } = require('zod');

const updateUserRoleSchema = {
  body: z.object({
    role: z.enum(['customer', 'verified', 'business', 'admin']),
  }),
};

const updateUserStatusSchema = {
  body: z.object({
    active: z.boolean(),
  }),
};

module.exports = { updateUserRoleSchema, updateUserStatusSchema };
