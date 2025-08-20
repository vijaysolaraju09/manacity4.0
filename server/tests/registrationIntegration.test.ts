import mongoose from 'mongoose';
import { RegistrationModel, RegistrationStatus } from '../models/Registration';
import { EventModel } from '../models/Event';

describe('registration approve flow', () => {
  it('updates event registered count on approval changes', async () => {
    const eventId = new mongoose.Types.ObjectId();
    const spy = jest.spyOn(EventModel, 'findByIdAndUpdate').mockResolvedValue(null as any);

    const reg: any = new RegistrationModel({ eventId, userId: new mongoose.Types.ObjectId(), status: RegistrationStatus.APPROVED });
    reg.$locals = { wasNew: true };
    const hook = (RegistrationModel as any).schema.s.hooks._posts.get('save')[0].fn;
    await hook.call(reg, reg, () => {});
    expect(spy).toHaveBeenCalledWith(eventId, { $inc: { registeredCount: 1 } });

    spy.mockClear();
    reg.$locals = { wasNew: false, prevStatus: RegistrationStatus.APPROVED };
    reg.status = RegistrationStatus.PENDING;
    await hook.call(reg, reg, () => {});
    expect(spy).toHaveBeenCalledWith(eventId, { $inc: { registeredCount: -1 } });
  });
});
