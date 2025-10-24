#!/usr/bin/env node
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const FormTemplate = require('../models/FormTemplate');
const User = require('../models/User');
const { validateFieldDefinitions } = require('../utils/dynamicForm');

dotenv.config();

const templates = [
  {
    name: 'BGMI Solo Registration',
    category: 'esports',
    fields: [
      {
        id: 'ign',
        label: 'IGN',
        type: 'short_text',
        required: true,
        pattern: '^[A-Za-z0-9_]{3,16}$',
        help: 'Your in-game name (3-16 characters)',
      },
      {
        id: 'bgmi_uid',
        label: 'BGMI UID',
        type: 'number',
        required: true,
      },
      {
        id: 'device',
        label: 'Device',
        type: 'dropdown',
        options: ['Android', 'iOS'],
      },
      {
        id: 'headset',
        label: 'Headset? ',
        type: 'radio',
        options: ['Yes', 'No'],
      },
      {
        id: 'whatsapp',
        label: 'WhatsApp Number',
        type: 'phone',
        required: true,
      },
    ],
  },
  {
    name: 'Kahoot Quiz Team',
    category: 'quiz',
    fields: [
      {
        id: 'team_name',
        label: 'Team Name',
        type: 'short_text',
        required: true,
      },
      {
        id: 'members',
        label: 'Members',
        type: 'number',
        required: true,
        min: 1,
        max: 4,
      },
      {
        id: 'team_lead_email',
        label: 'Team Lead Email',
        type: 'email',
        required: true,
      },
      {
        id: 'notes',
        label: 'Notes',
        type: 'textarea',
      },
    ],
  },
  {
    name: 'Cricket 6-a-side',
    category: 'sports',
    fields: [
      {
        id: 'team_name',
        label: 'Team Name',
        type: 'short_text',
        required: true,
      },
      {
        id: 'captain_name',
        label: 'Captain Name',
        type: 'short_text',
        required: true,
      },
      {
        id: 'captain_phone',
        label: 'Captain Phone',
        type: 'phone',
        required: true,
      },
      {
        id: 'player_list',
        label: 'Player List',
        type: 'textarea',
        help: 'Add 6 names, one per line',
      },
      {
        id: 'preferred_slot',
        label: 'Preferred Slot',
        type: 'dropdown',
        options: ['Morning', 'Afternoon', 'Evening'],
      },
      {
        id: 'payment_proof',
        label: 'Payment Proof',
        type: 'file',
      },
    ],
  },
];

async function bootstrap() {
  if (!process.env.MONGO_URI) {
    throw new Error('MONGO_URI is required to run the seed script');
  }
  await mongoose.connect(process.env.MONGO_URI);
  let admin = await User.findOne({ role: 'admin' }).select('_id').lean();
  if (!admin) {
    console.warn('No admin user found; seeding templates with a placeholder admin id');
    admin = { _id: new mongoose.Types.ObjectId() };
  }

  for (const tpl of templates) {
    const fields = validateFieldDefinitions(tpl.fields);
    await FormTemplate.findOneAndUpdate(
      { name: tpl.name },
      {
        $set: {
          category: tpl.category,
          fields,
          updatedAt: new Date(),
        },
        $setOnInsert: {
          createdBy: admin._id,
          createdAt: new Date(),
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }

  console.log('Form templates seeded successfully');
  await mongoose.disconnect();
}

bootstrap().catch((err) => {
  console.error('Failed to seed form templates', err);
  process.exitCode = 1;
});
