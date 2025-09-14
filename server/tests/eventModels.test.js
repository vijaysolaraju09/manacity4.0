const mongoose = require('mongoose');
const Event = require('../models/Event');
const EventRegistration = require('../models/EventRegistration');

describe('Event domain models', () => {
  it('enforces indexes and defaults', async () => {
    const event = new Event({
      title: 'Test Event',
      type: 'activity',
      category: 'campfire',
      maxParticipants: 10,
      registrationOpenAt: new Date(),
      registrationCloseAt: new Date(Date.now() + 1000),
      startAt: new Date(Date.now() + 2000),
      createdBy: new mongoose.Types.ObjectId(),
    });
    await event.validate();
    expect(event.registeredCount).toBe(0);
    const indexes = Event.schema.indexes();
    const composite = indexes.find(([idx]) => idx.status === 1 && idx.category === 1 && idx.startAt === -1);
    expect(composite).toBeDefined();
  });

  it('registration has compound unique index', async () => {
    const reg = new EventRegistration({
      event: new mongoose.Types.ObjectId(),
      user: new mongoose.Types.ObjectId(),
    });
    await reg.validate();
    expect(reg.status).toBe('registered');
    const indexes = EventRegistration.schema.indexes();
    const uniqueIdx = indexes.find(([idx, opts]) => idx.event === 1 && idx.user === 1 && opts.unique);
    expect(uniqueIdx).toBeDefined();
  });
});
