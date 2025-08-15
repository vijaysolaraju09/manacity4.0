const { z } = require('zod');

const addSpecialProductSchema = {
  body: z.object({
    name: z.string().min(1),
    category: z.string().min(1),
    description: z.string().optional(),
    image: z.string().optional(),
    price: z.string().optional(),
  }),
};

module.exports = { addSpecialProductSchema };
