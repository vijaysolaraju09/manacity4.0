const express = require('express');
const { z } = require('zod');
const protect = require('../middleware/authMiddleware');
const ensureAdmin = require('../middleware/ensureAdmin');
const validate = require('../middleware/validate');
const {
  createTemplate,
  listTemplates,
  getTemplate,
  updateTemplate,
  deleteTemplate,
} = require('../controllers/formTemplateController');

const router = express.Router();

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

const createTemplateSchema = {
  body: z
    .object({
      name: z.string().trim().min(3).max(160),
      category: z.enum(['esports', 'quiz', 'sports', 'other']).optional(),
      fields: z.array(fieldSchema).min(1),
    })
    .strict(),
};

const updateTemplateSchema = {
  body: z
    .object({
      name: z.string().trim().min(3).max(160).optional(),
      category: z.enum(['esports', 'quiz', 'sports', 'other']).optional(),
      fields: z.array(fieldSchema).optional(),
    })
    .strict(),
};

router.use(protect, ensureAdmin);

router.post('/', validate(createTemplateSchema), createTemplate);
router.get('/', validate({ query: z.object({ category: z.string().optional() }).strict() }), listTemplates);
router.get('/:id', getTemplate);
router.put('/:id', validate(updateTemplateSchema), updateTemplate);
router.delete('/:id', deleteTemplate);

module.exports = router;
