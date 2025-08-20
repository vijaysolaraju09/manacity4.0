import mongoose from 'mongoose';
import { EventModel, EventStatus } from '../models/Event';

describe('event status transitions', () => {
  const now = new Date();
  const base = {
    title: 'Test',
    category: 'gaming',
    registrationClosesAt: now,
    capacity: 10,
    organizerId: new mongoose.Types.ObjectId(),
    location: { type: 'online' },
  };

  it('sets upcoming, active and ended based on time', async () => {
    const upcoming = new EventModel({
      ...base,
      startAt: new Date(now.getTime() + 60_000),
      endAt: new Date(now.getTime() + 120_000),
    });
    await upcoming.validate();
    expect(upcoming.status).toBe(EventStatus.UPCOMING);

    const active = new EventModel({
      ...base,
      startAt: new Date(now.getTime() - 60_000),
      endAt: new Date(now.getTime() + 60_000),
    });
    await active.validate();
    expect(active.status).toBe(EventStatus.ACTIVE);

    const ended = new EventModel({
      ...base,
      startAt: new Date(now.getTime() - 120_000),
      endAt: new Date(now.getTime() - 60_000),
    });
    await ended.validate();
    expect(ended.status).toBe(EventStatus.ENDED);
  });

  it('keeps cancelled status', async () => {
    const cancelled = new EventModel({
      ...base,
      startAt: new Date(now.getTime() - 120_000),
      endAt: new Date(now.getTime() + 120_000),
      status: EventStatus.CANCELLED,
    });
    await cancelled.validate();
    expect(cancelled.status).toBe(EventStatus.CANCELLED);
  });
});
