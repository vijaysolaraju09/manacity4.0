const mongoose = require('mongoose');
const { EventModel } = require('../models/Event');
const { RegistrationModel } = require('../models/Registration');

describe('Event and Registration schemas', () => {
  it('derives status, generates slug and has required indexes', async () => {
    const now = new Date();
    const spy = jest
      .spyOn(EventModel, 'exists')
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false);
    const event = new EventModel({
      title: 'Sample Event',
      category: 'gaming',
      startAt: new Date(now.getTime() - 1000),
      endAt: new Date(now.getTime() + 1000),
      registrationClosesAt: now,
      capacity: 50,
      organizerId: new mongoose.Types.ObjectId(),
      location: { type: 'online' },
    });
    await event.validate();
    expect(event.slug).toBe('sample-event-1');
    expect(event.status).toBe('active');
    const indexes = EventModel.schema.indexes();
    const slugIndex = indexes.find(([idx]) => idx.slug === 1);
    const statusIndex = indexes.find(([idx]) => idx.status === 1 && idx.startAt === -1);
    const categoryIndex = indexes.find(([idx]) => idx.category === 1 && idx.startAt === -1);
    expect(slugIndex).toBeDefined();
    expect(statusIndex).toBeDefined();
    expect(categoryIndex).toBeDefined();
    spy.mockRestore();
  });

  it('has compound unique index and defaults for registration', async () => {
    const reg = new RegistrationModel({
      eventId: new mongoose.Types.ObjectId(),
      userId: new mongoose.Types.ObjectId(),
    });
    await reg.validate();
    expect(reg.status).toBe('pending');
    const indexes = RegistrationModel.schema.indexes();
    const compound = indexes.find(([idx, opts]) => idx.eventId === 1 && idx.userId === 1 && opts.unique);
    expect(compound).toBeDefined();
  });
});
