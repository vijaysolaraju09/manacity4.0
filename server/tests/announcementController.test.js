const Announcement = require('../models/Announcement');
const User = require('../models/User');
const { notifyUsers } = require('../services/notificationService');
const { createAnnouncement } = require('../controllers/announcementController');

jest.mock('../models/Announcement', () => ({
  create: jest.fn(),
  updateMany: jest.fn(),
}));

jest.mock('../models/User', () => ({
  find: jest.fn(),
}));

jest.mock('../services/notificationService', () => ({
  notifyUsers: jest.fn(),
}));

describe('announcementController.createAnnouncement', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const buildQueryMock = (users = []) => {
    const query = {
      select: jest.fn(),
      lean: jest.fn(),
    };
    query.select.mockReturnValue(query);
    query.lean.mockResolvedValue(users);
    return query;
  };

  it('broadcasts announcement notifications with CTA links and priority flags', async () => {
    const announcementDoc = {
      _id: 'ann-1',
      title: 'City alert',
      text: 'Check the new rules',
      image: 'https://images.example/banner.png',
      ctaText: 'Read update',
      ctaLink: '/alerts',
      active: true,
      highPriority: true,
    };
    Announcement.create.mockResolvedValue(announcementDoc);
    User.find.mockReturnValue(buildQueryMock([{ _id: 'user-1' }, { _id: 'user-2' }]));

    const req = {
      body: {
        title: 'City alert',
        text: 'Check the new rules',
        ctaLink: '/alerts',
        ctaText: 'Read update',
        highPriority: true,
        active: true,
      },
    };
    const json = jest.fn();
    const res = { status: jest.fn(), json };
    res.status.mockReturnValue(res);

    await createAnnouncement(req, res, jest.fn());

    expect(Announcement.create).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'City alert', highPriority: true }),
    );
    expect(User.find).toHaveBeenCalledWith({ isActive: { $ne: false } });
    expect(notifyUsers).toHaveBeenCalledWith(
      ['user-1', 'user-2'],
      expect.objectContaining({
        type: 'announcement',
        priority: 'high',
        pinned: true,
        targetLink: '/alerts',
      }),
    );
    expect(res.status).toHaveBeenCalledWith(201);
    expect(json).toHaveBeenCalledWith({ announcement: announcementDoc });
  });

  it('falls back to the announcement detail page when no CTA is provided', async () => {
    const announcementDoc = {
      _id: 'ann-99',
      title: 'Service update',
      text: 'Details inside',
      active: true,
      highPriority: false,
    };
    Announcement.create.mockResolvedValue(announcementDoc);
    User.find.mockReturnValue(buildQueryMock([{ _id: 'user-3' }]));

    const req = { body: { title: 'Service update', text: 'Details inside', active: true } };
    const json = jest.fn();
    const res = { status: jest.fn(), json };
    res.status.mockReturnValue(res);

    await createAnnouncement(req, res, jest.fn());

    const notifyCall = notifyUsers.mock.calls[notifyUsers.mock.calls.length - 1];
    const payload = notifyCall[1];
    expect(payload.targetLink).toBe('/announcements/ann-99');
  });
});
